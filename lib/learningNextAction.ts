import type { WeakChapter } from "@/lib/weakChapter";

export type LearningActionType = "REVIEW_DUE" | "WEAK_CHAPTER" | "CONTINUE" | "DISCOVER";

export type RecentLearningCandidate = {
  quizId: number;
  quizTitle: string;
};

export type LearningNextAction = {
  type: LearningActionType;
  title: string;
  reason: string;
  ctaLabel: string;
  target: string;
  metadata?: {
    dueCount?: number;
    quizId?: number;
    chapterId?: number;
    accuracy?: number;
    uniqueQuestionCount?: number;
    answerCount?: number;
  };
};

export type LearningNextActionInput = {
  dueReviewCount: number;
  weakChapter: WeakChapter | null;
  recentLearning: RecentLearningCandidate | null;
  hasCatalog: boolean;
};

/**
 * Deterministic learning decision layer for the Home learning entry point.
 *
 * Priority:
 * 1. Due review items
 * 2. Weak chapter with sufficient evidence
 * 3. Recent learning
 * 4. Discover/create content
 */
export function getLearningNextAction({
  dueReviewCount,
  weakChapter,
  recentLearning,
  hasCatalog,
}: LearningNextActionInput): LearningNextAction {
  if (dueReviewCount > 0) {
    return {
      type: "REVIEW_DUE",
      title: "Ôn tập hôm nay",
      reason: `Bạn có ${dueReviewCount} câu đã đến hạn ôn.`,
      ctaLabel: "Ôn tập ngay",
      target: "/smart-review",
      metadata: { dueCount: dueReviewCount },
    };
  }

  if (weakChapter) {
    const subjectPrefix = weakChapter.subjectName ? `${weakChapter.subjectName} · ` : "";
    return {
      type: "WEAK_CHAPTER",
      title: "Nên luyện thêm",
      reason: `${subjectPrefix}${weakChapter.chapterName} · ${weakChapter.accuracy}% đúng trên ${weakChapter.uniqueQuestionCount} câu đã làm.`,
      ctaLabel: "Luyện chương này",
      target: `/practice/chapter-${weakChapter.chapterId}`,
      metadata: {
        chapterId: weakChapter.chapterId,
        accuracy: weakChapter.accuracy,
        uniqueQuestionCount: weakChapter.uniqueQuestionCount,
        answerCount: weakChapter.answerCount,
      },
    };
  }

  if (recentLearning) {
    return {
      type: "CONTINUE",
      title: "Tiếp tục học",
      reason: `Mở lại ${recentLearning.quizTitle} vừa học gần đây.`,
      ctaLabel: "Tiếp tục học",
      target: `/practice/${recentLearning.quizId}`,
      metadata: { quizId: recentLearning.quizId },
    };
  }

  return {
    type: "DISCOVER",
    title: hasCatalog ? "Khám phá bộ đề" : "Tạo bộ đề đầu tiên",
    reason: hasCatalog
      ? "Chọn một bộ đề phù hợp và bắt đầu làm bài."
      : "Tạo bộ đề của riêng bạn để bắt đầu ôn tập.",
    ctaLabel: hasCatalog ? "Khám phá bộ đề" : "Tạo bộ đề",
    target: hasCatalog ? "#quiz-catalog" : "/quizzes/create",
  };
}
