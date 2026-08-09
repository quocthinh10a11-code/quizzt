import { NextRequest, NextResponse } from "next/server";
import { getReviewRecommendation } from "@/lib/ai/provider";
import type { RecommendationItem } from "@/lib/ai/provider";
import { getAuthenticatedContext } from "@/lib/ai/auth";
import { checkAndRecordRateLimit } from "@/lib/ai/rateLimit";
import { getLearningHistoryForQuestions, getHistoryOrEmpty } from "@/lib/ai/learningHistory";

const RECOMMEND_RATE_LIMIT_PER_MINUTE = 5;

// Dữ liệu client THỰC SỰ gửi lên: KHÔNG bao gồm 4 field lịch sử làm bài.
// Các field đó LUÔN được server tính lại từ DB dựa trên authenticated userId —
// nếu client cố gửi kèm wrongCount/... trong body, chúng sẽ bị bỏ qua vì type
// này không có các field đó, và bước enrich bên dưới luôn ghi đè bằng dữ liệu
// server tự truy vấn.
type RequestRecommendationItem = Omit
  RecommendationItem,
  "wrongCount" | "correctCount" | "totalAttemptCount" | "lastAttemptAt"
>;

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để sử dụng tính năng này." }, { status: 401 });
    }
    const { supabase: authedSupabase, userId } = authContext;

    const rateLimitResult = await checkAndRecordRateLimit(
      authedSupabase,
      userId,
      "recommend",
      RECOMMEND_RATE_LIMIT_PER_MINUTE
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Bạn đã yêu cầu gợi ý quá nhanh. Vui lòng đợi ${rateLimitResult.retryAfterSeconds} giây rồi thử lại.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawItems: RequestRecommendationItem[] = body.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "Thiếu danh sách câu hỏi." }, { status: 400 });
    }
    if (rawItems.length > 30) {
      return NextResponse.json({ error: "Tối đa 30 câu mỗi lần gợi ý." }, { status: 400 });
    }

    // Step 1 (Phase 5): làm giàu dữ liệu bằng lịch sử làm bài thực tế của user
    // hiện tại. MỘT query batch duy nhất cho toàn bộ danh sách — KHÔNG N+1.
    // Learning history chỉ enrich các câu ĐÃ có trong danh sách nhận từ client
    // (danh sách này do Review Queue quyết định ở phía client) — không thêm,
    // không bớt, không đổi thứ tự tại bước này.
    const questionIds = rawItems.map((item) => item.questionId);
    const historyMap = await getLearningHistoryForQuestions(authedSupabase, userId, questionIds);

    const items: RecommendationItem[] = rawItems.map((item) => {
      const history = getHistoryOrEmpty(historyMap, item.questionId);
      return {
        ...item,
        wrongCount: history.wrongCount,
        correctCount: history.correctCount,
        totalAttemptCount: history.totalAttemptCount,
        lastAttemptAt: history.lastAttemptAt,
      };
    });

    const result = await getReviewRecommendation(items);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}