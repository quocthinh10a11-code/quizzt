import { getGeminiRecommendation } from "./gemini";
import type { RecommendationItem, RecommendationResult } from "./gemini";

// Lớp trừu tượng duy nhất mà API route gọi tới. Sau này muốn đổi sang
// OpenAI/Claude, chỉ sửa hàm bên trong file này — không đụng route hay UI.
export async function getReviewRecommendation(items: RecommendationItem[]): Promise<RecommendationResult[]> {
  return getGeminiRecommendation(items);
}

export type { RecommendationItem, RecommendationResult };