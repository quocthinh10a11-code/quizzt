import { buildRecommendationPrompt, type RecommendationItem } from "./prompts";

export type RecommendationResult = {
  questionId: number;
  priority: number;
  reason: string;
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function getGeminiRecommendation(items: RecommendationItem[]): Promise<RecommendationResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu GEMINI_API_KEY trong biến môi trường server.");
  }

  const prompt = buildRecommendationPrompt(items);

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Đã vượt giới hạn miễn phí của Gemini API trong thời gian ngắn. Vui lòng đợi khoảng 1 phút rồi thử lại.");
    }
    const errText = await response.text();
    throw new Error(`Gemini API lỗi (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini không trả về nội dung hợp lệ.");

  let parsed: RecommendationResult[];
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Không parse được JSON từ Gemini.");
  }

  if (!Array.isArray(parsed)) throw new Error("Định dạng phản hồi từ Gemini không đúng.");
  return parsed;
}