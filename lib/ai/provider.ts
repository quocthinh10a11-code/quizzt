import { getGroqRecommendation, askTutorGroq, getGroqLearningInsight } from "./groq";
import type { ChatMessage } from "./groq";
import type { RecommendationItem, RecommendationResult } from "./prompts";
import type { TutorQuestionContext, TutorScreenContext, ReviewMeta } from "./types/tutor";
import type { LearningInsight, LearningInsightContext } from "./learningInsight";

// Lớp trừu tượng duy nhất mà API route gọi tới. KHÔNG biết gì về Prompt Architecture
// bên trong groq.ts — chỉ chuyển tiếp lời gọi. Đổi provider (Gemini/OpenAI) sau này
// chỉ cần sửa các hàm bên trong file này.
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

export type { RecommendationItem, RecommendationResult, TutorQuestionContext, ChatMessage };
export type { LearningInsight, LearningInsightContext } from "./learningInsight";
