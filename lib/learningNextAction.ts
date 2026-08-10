export type LearningActionType = "REVIEW_DUE" | "CONTINUE" | "DISCOVER";

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
  };
};

export type LearningNextActionInput = {
  dueReviewCount: number;
  recentLearning: RecentLearningCandidate | null;
  hasCatalog: boolean;
};

/**
 * Deterministic MVP decision layer for the Home learning entry point.
 *
 * Priority:
 * 1. Due review items
 * 2. Recent learning
 * 3. Discover/create content
 *
 * Weak-topic recommendation is intentionally not included until the current
 * data model can provide a reliable subject/chapter accuracy signal.
 */
export function getLearningNextAction({
  dueReviewCount,
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
