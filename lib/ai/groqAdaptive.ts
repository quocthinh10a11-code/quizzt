import {
  buildAdaptivePracticePrompt,
  parseAdaptivePracticeResult,
  type AdaptivePracticeContext,
  type AdaptivePracticeResult,
} from "./adaptivePractice";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function getGroqAdaptivePractice(context: AdaptivePracticeContext): Promise<AdaptivePracticeResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Thiếu GROQ_API_KEY trong biến môi trường server.");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: buildAdaptivePracticePrompt(context) }],
      temperature: 0.2,
      max_tokens: 250,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Đã vượt giới hạn miễn phí của Groq trong thời gian ngắn.");
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

  const result = parseAdaptivePracticeResult(parsed);
  if (!result) throw new Error("Định dạng phản hồi Adaptive Practice từ Groq không hợp lệ.");
  return result;
}
