import { NextRequest, NextResponse } from "next/server";
import { getReviewRecommendation } from "@/lib/ai/provider";
import type { RecommendationItem } from "@/lib/ai/provider";
import { getAuthenticatedContext } from "@/lib/ai/auth";
import { checkAndRecordRateLimit } from "@/lib/ai/rateLimit";

const RECOMMEND_RATE_LIMIT_PER_MINUTE = 5;

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
    const items: RecommendationItem[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Thiếu danh sách câu hỏi." }, { status: 400 });
    }
    if (items.length > 30) {
      return NextResponse.json({ error: "Tối đa 30 câu mỗi lần gợi ý." }, { status: 400 });
    }

    const result = await getReviewRecommendation(items);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}