import { getGroqRecommendation, askTutorGroq, getGroqLearningInsight } from "./groq";
import { getGroqAdaptivePractice } from "./groqAdaptive";
import type { ChatMessage } from "./groq";
import type { RecommendationItem, RecommendationResult } from "./prompts";
import type { TutorQuestionContext, TutorScreenContext, ReviewMeta } from "./types/tutor";
import type { LearningInsight, LearningInsightContext } from "./learningInsight";
import type { AdaptivePracticeContext, AdaptivePracticeResult } from "./adaptivePractice";

// Lớp trừu tượng duy nhất mà API route gọi tới. KHÔNG biết gì về Prompt Architecture
// bên trong provider-specific files — chỉ chuyển tiếp lời gọi. Đổi provider sau này
// chỉ cần sửa các hàm bên trong lớp provider này.
export type TutorMode = "learning" | "review";

export async function getReviewRecommendation(items: RecommendationItem[]): Promise<RecommendationResult[]> {
  return getGroqRecommendation(items);
}

export async function askTutor(
  questionContext: TutorQuestionContext,
  mode: TutorMode,
  history: ChatMessage[],
  userMessage: string,
  screenContext: TutorScreenContext = "practice",
  reviewMeta?: ReviewMeta
): Promise<string> {
  return askTutorGroq(questionContext, mode, history, userMessage, screenContext, reviewMeta);
}

export async function getLearningInsight(context: LearningInsightContext): Promise<LearningInsight> {
  return getGroqLearningInsight(context);
}

export async function getAdaptivePracticeRanking(context: AdaptivePracticeContext): Promise<AdaptivePracticeResult> {
  return getGroqAdaptivePractice(context);
}

export type { RecommendationItem, RecommendationResult, TutorQuestionContext, ChatMessage };
export type { LearningInsight, LearningInsightContext } from "./learningInsight";
export type { AdaptivePracticeContext, AdaptivePracticeResult } from "./adaptivePractice";
