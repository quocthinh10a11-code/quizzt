import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/ai/auth";
import { checkAndRecordRateLimit } from "@/lib/ai/rateLimit";
import { getStudyPlan, type StudyPlanContext } from "@/lib/ai/provider";
import { buildDeterministicStudyPlan } from "@/lib/ai/studyPlan";
import { getUserAttemptsResult, type AttemptSummary } from "@/lib/quizAttempts";
import { getDueReviewCountResult } from "@/lib/reviewQueue";
import { getWeakChapterResult } from "@/lib/weakChapter";

const STUDY_PLAN_RATE_LIMIT_PER_MINUTE = 5;
const DEFAULT_DURATION_DAYS = 7;
const MIN_DURATION_DAYS = 3;
const MAX_DURATION_DAYS = 14;
const RECENT_ATTEMPT_LIMIT = 12;

function getRecentLearning(attempts: AttemptSummary[]) {
  const recent = attempts.find((attempt) => attempt.quiz_id !== null && attempt.total_questions > 0);
  if (!recent || recent.quiz_id === null) return null;

  return {
    quizId: recent.quiz_id,
    title: recent.quiz_title.slice(0, 200),
    accuracy: (recent.correct_count / recent.total_questions) * 100,
    attemptType: recent.attempt_type,
  };
}

function buildAllowedActions(context: {
  dueReviewCount: number;
  weakChapter: Awaited<ReturnType<typeof getWeakChapterResult>>["data"];
  recentLearning: ReturnType<typeof getRecentLearning>;
}): StudyPlanContext["allowedActions"] {
  const actions: StudyPlanContext["allowedActions"] = [];

  if (context.dueReviewCount > 0) {
    actions.push({
      id: "review_due",
      type: "review_due",
      title: `Ôn ${context.dueReviewCount} câu đến hạn`,
      reason: "Có nội dung trong hàng đợi ôn tập đã đến hạn.",
      target: "/smart-review",
    });
  }

  if (context.weakChapter) {
    actions.push({
      id: `weak_chapter_${context.weakChapter.chapterId}`,
      type: "practice_chapter",
      title: `Luyện ${context.weakChapter.chapterName}`,
      reason: `Accuracy ${context.weakChapter.accuracy.toFixed(1)}% trên ${context.weakChapter.uniqueQuestionCount} câu với đủ evidence để ưu tiên.`,
      target: `/practice/chapter-${context.weakChapter.chapterId}`,
    });
  }

  if (context.recentLearning) {
    actions.push({
      id: `recent_quiz_${context.recentLearning.quizId}`,
      type: "continue_quiz",
      title: `Tiếp tục ${context.recentLearning.title}`,
      reason: "Đây là nội dung gần đây nhất có thể tiếp tục luyện tập.",
      target: `/practice/${context.recentLearning.quizId}`,
    });
  }

  actions.push({
    id: "discover_content",
    type: "discover_content",
    title: "Khám phá bộ đề",
    reason: "Chọn nội dung mới khi chưa có evidence đủ mạnh để ưu tiên một chủ đề.",
    target: "/",
  });

  actions.push({
    id: "progress_check",
    type: "progress_check",
    title: "Xem lại tiến độ",
    reason: "Kiểm tra lịch sử học tập trước khi điều chỉnh nhịp học.",
    target: "/history",
  });

  return actions;
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để sử dụng tính năng này." }, { status: 401 });
    }

    const { supabase, userId } = authContext;
    const rateLimitResult = await checkAndRecordRateLimit(
      supabase,
      userId,
      "study_plan",
      STUDY_PLAN_RATE_LIMIT_PER_MINUTE
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Bạn đã yêu cầu lập kế hoạch quá nhanh. Vui lòng đợi ${rateLimitResult.retryAfterSeconds} giây rồi thử lại.` },
        { status: 429 }
      );
    }

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body không hợp lệ." }, { status: 400 });
    }

    if (body !== null && typeof body !== "object") {
      return NextResponse.json({ error: "Request body không hợp lệ." }, { status: 400 });
    }

    const rawDuration = (body as { durationDays?: unknown } | null)?.durationDays;
    const requestedDuration = rawDuration === undefined ? DEFAULT_DURATION_DAYS : rawDuration;
    const durationDays = typeof requestedDuration === "number" ? requestedDuration : NaN;

    if (!Number.isInteger(durationDays) || durationDays < MIN_DURATION_DAYS || durationDays > MAX_DURATION_DAYS) {
      return NextResponse.json(
        { error: `durationDays phải là số nguyên từ ${MIN_DURATION_DAYS} đến ${MAX_DURATION_DAYS}.` },
        { status: 400 }
      );
    }

    const [dueResult, weakResult, attemptsResult] = await Promise.all([
      getDueReviewCountResult(userId),
      getWeakChapterResult(userId),
      getUserAttemptsResult(userId, ["quiz", "adaptive"], RECENT_ATTEMPT_LIMIT),
    ]);

    if (dueResult.error || weakResult.error || attemptsResult.error) {
      console.error("[studyPlan] Không thể tải learner evidence:", {
        due: dueResult.error,
        weak: weakResult.error,
        attempts: attemptsResult.error,
      });
      return NextResponse.json({ error: "Không thể tải dữ liệu học tập lúc này." }, { status: 500 });
    }

    const recentLearning = getRecentLearning(attemptsResult.data);
    const allowedActions = buildAllowedActions({
      dueReviewCount: dueResult.count,
      weakChapter: weakResult.data,
      recentLearning,
    });

    const context: StudyPlanContext = {
      durationDays,
      dueReviewCount: dueResult.count,
      weakChapter: weakResult.data
        ? {
            id: weakResult.data.chapterId,
            name: weakResult.data.chapterName.slice(0, 200),
            subject: weakResult.data.subjectName?.slice(0, 200) ?? null,
            accuracy: weakResult.data.accuracy,
            uniqueQuestionCount: weakResult.data.uniqueQuestionCount,
            answerCount: weakResult.data.answerCount,
          }
        : null,
      recentLearning,
      allowedActions,
    };

    const fallback = buildDeterministicStudyPlan(context);

    try {
      const plan = await getStudyPlan(context);
      return NextResponse.json({ plan, source: "ai" });
    } catch (error) {
      console.error("[studyPlan] AI failed, using deterministic fallback:", error);
      return NextResponse.json({ plan: fallback, source: "fallback" });
    }
  } catch (error) {
    console.error("[studyPlan] Unexpected error:", error);
    return NextResponse.json({ error: "Không thể tạo kế hoạch học tập lúc này." }, { status: 500 });
  }
}
