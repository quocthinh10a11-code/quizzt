import { getGroqRecommendation, askTutorGroq } from "./groq";
import type { ChatMessage } from "./groq";
import type { RecommendationItem, RecommendationResult } from "./prompts";
import type { TutorQuestionContext } from "./types/tutor";

// Lớp trừu tượng duy nhất mà API route gọi tới. KHÔNG biết gì về Prompt Architecture
// bên trong groq.ts — chỉ chuyển tiếp lời gọi. Đổi provider (Gemini/OpenAI) sau này
// chỉ cần sửa 2 hàm bên trong file này.
export type TutorMode = "learning" | "review";

export async function getReviewRecommendation(items: RecommendationItem[]): Promise<RecommendationResult[]> {
  return getGroqRecommendation(items);
}

export async function askTutor(
  questionContext: TutorQuestionContext,
  mode: TutorMode,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  return askTutorGroq(questionContext, mode, history, userMessage);
}

export type { RecommendationItem, RecommendationResult, TutorQuestionContext, ChatMessage };