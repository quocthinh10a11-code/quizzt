export type LearningInsightQuestion = {
  question: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  chapter: string | null;
  subject: string | null;
  difficulty: string | null;
};

export type LearningInsightChapterPerformance = {
  chapter: string;
  subject: string | null;
  correct: number;
  total: number;
  accuracy: number;
};

export type LearningInsightContext = {
  score: number;
  totalQuestions: number;
  wrongQuestions: LearningInsightQuestion[];
  chapterPerformance: LearningInsightChapterPerformance[];
};

export type LearningInsight = {
  summary: string;
  strengths: string[];
  focusAreas: string[];
  nextAction: string;
};

export function buildLearningInsightPrompt(context: LearningInsightContext): string {
  return `Bạn là trợ giảng học tập của Quizzt. Hãy phân tích một phiên luyện tập dựa CHỈ trên dữ liệu được cung cấp bên dưới.

Mục tiêu: giúp sinh viên hiểu họ vừa học được gì, gặp khó khăn ở đâu và nên làm gì tiếp theo. Đây là learning insight ngắn, không phải chatbot và không phải báo cáo dài.

QUY TẮC:
- Không tự tính hoặc sửa score; score và các số liệu trong dữ liệu là nguồn sự thật.
- Không bịa chủ đề, misconception hoặc điểm yếu nếu dữ liệu không đủ evidence.
- Một câu sai đơn lẻ không đủ để kết luận sinh viên yếu một chủ đề.
- Phân biệt lỗi đơn lẻ với pattern lặp lại. Chỉ gọi là pattern khi có từ 2 câu sai cùng chapter/chủ đề hoặc evidence tương tự rõ ràng.
- Nếu không có câu sai, tập trung vào điểm mạnh và bước duy trì.
- Nếu nhiều câu sai thuộc các chủ đề khác nhau, không ép chúng thành một misconception duy nhất.
- Chỉ đề xuất next action dựa trên dữ liệu phiên học; không thay đổi Learning Next Action của Quizzt.
- Không nhắc tới dữ liệu riêng tư ngoài nội dung học tập được cung cấp.
- Viết bằng tiếng Việt, ngắn gọn, thân thiện với sinh viên.

OUTPUT: Chỉ trả về JSON hợp lệ, không markdown, đúng shape:
{
  "summary": "string",
  "strengths": ["string"],
  "focusAreas": ["string"],
  "nextAction": "string"
}

Yêu cầu độ dài:
- summary: 1-2 câu.
- strengths: tối đa 2 mục.
- focusAreas: tối đa 2 mục.
- nextAction: 1 câu ngắn, có thể hành động.

DỮ LIỆU PHIÊN HỌC:
${JSON.stringify(context)}`;
}

export function parseLearningInsight(value: unknown): LearningInsight | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  const nextAction = typeof data.nextAction === "string" ? data.nextAction.trim() : "";
  const strengths = Array.isArray(data.strengths)
    ? data.strengths.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 2)
    : [];
  const focusAreas = Array.isArray(data.focusAreas)
    ? data.focusAreas.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 2)
    : [];

  if (!summary || !nextAction) return null;

  return { summary, strengths, focusAreas, nextAction };
}
