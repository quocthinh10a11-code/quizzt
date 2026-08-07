import { buildRecommendationPrompt } from "./prompts";
import type { RecommendationItem, RecommendationResult } from "./prompts";
import { buildTutorPrompt } from "./prompts/index";
import type { TutorQuestionContext, TutorAnswerVisibility, TutorScreenContext, ReviewMeta } from "./types/tutor";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function getGroqRecommendation(items: RecommendationItem[]): Promise<RecommendationResult[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu GROQ_API_KEY trong biến môi trường server.");
  }

  const prompt = buildRecommendationPrompt(items);

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Đã vượt giới hạn miễn phí của Groq trong thời gian ngắn. Vui lòng đợi rồi thử lại.");
    }
    const errText = await response.text();
    throw new Error(`Groq API lỗi (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq không trả về nội dung hợp lệ.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Không parse được JSON từ Groq.");
  }

  if (Array.isArray(parsed)) return parsed as RecommendationResult[];
  if (parsed && typeof parsed === "object") {
    const firstArrayValue = Object.values(parsed).find((v) => Array.isArray(v));
    if (firstArrayValue) return firstArrayValue as RecommendationResult[];
  }
  throw new Error("Định dạng phản hồi từ Groq không đúng.");
}

const MAX_HISTORY_MESSAGES = 6;

// Dịch TutorMode cũ ("learning"/"review", chữ ký public route đang dùng) sang
// TutorAnswerVisibility mới ("hidden"/"revealed", dùng nội bộ trong Prompt Architecture).
// Đặt việc dịch ở ĐÂY (chi tiết triển khai), không đặt ở provider.ts (lớp abstraction),
// để provider.ts không cần biết gì về Prompt Architecture bên trong.
function toAnswerVisibility(mode: "learning" | "review"): TutorAnswerVisibility {
  return mode === "review" ? "revealed" : "hidden";
}

export async function askTutorGroq(
  questionContext: TutorQuestionContext,
  mode: "learning" | "review",
  history: ChatMessage[],
  userMessage: string,
  screenContext: TutorScreenContext = "practice",
  reviewMeta?: ReviewMeta
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu GROQ_API_KEY trong biến môi trường server.");
  }

  const visibility = toAnswerVisibility(mode);

  const systemPrompt = buildTutorPrompt(questionContext, visibility, screenContext, reviewMeta);
  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedHistory,
        { role: "user", content: userMessage },
      ],
      temperature: 0.5,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Đã vượt giới hạn miễn phí của Groq trong thời gian ngắn. Vui lòng đợi rồi thử lại.");
    }
    const errText = await response.text();
    throw new Error(`Groq API lỗi (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq không trả về nội dung hợp lệ.");

  return text.trim();
}