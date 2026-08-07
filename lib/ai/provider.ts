import { getGroqRecommendation, askTutorGroq } from "./groq";
import type { ChatMessage } from "./groq";
import type {
  RecommendationItem,
  RecommendationResult,
  TutorQuestionContext,
  TutorMode,
} from "./prompts";

// Lớp trừu tượng duy nhất mà API route gọi tới. Sau này muốn đổi provider,
// chỉ sửa hàm bên trong file này — không đụng route hay UI.
// Đang dùng Groq thay vì Gemini do project Google Cloud gặp lỗi 403 PERMISSION_DENIED.
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

export type { RecommendationItem, RecommendationResult, TutorQuestionContext, TutorMode, ChatMessage };