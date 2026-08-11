export type AdaptiveQuestionCandidate = {
  id: number;
  content: string;
  difficulty: "easy" | "medium" | "hard";
  chapter: string | null;
  subject: string | null;
  priorAttempts: number;
  priorCorrect: number;
  priorWrong: number;
  wasWrongRecently: boolean;
};

export type AdaptivePracticeContext = {
  targetChapters: string[];
  sourceAttemptScore: number;
  sourceAttemptTotal: number;
  candidates: AdaptiveQuestionCandidate[];
  desiredCount: number;
};

export type AdaptivePracticeResult = {
  selectedQuestionIds: number[];
  rationale: string;
};

export function buildAdaptivePracticePrompt(context: AdaptivePracticeContext): string {
  return `Bạn là bộ xếp hạng câu hỏi học tập của Quizzt. Hãy chọn các câu hỏi CÓ SẴN phù hợp nhất từ candidate set được cung cấp để tạo một phiên luyện tập cá nhân hóa ngắn.

QUY TẮC BẮT BUỘC:
- Chỉ chọn id xuất hiện trong CANDIDATE SET.
- Không tạo question mới và không suy đoán id.
- Không chọn trùng id.
- Ưu tiên sửa lỗi đã có evidence, đặc biệt câu từng sai và chapter có nhiều lỗi trong phiên nguồn.
- Nếu evidence yếu, ưu tiên đa dạng câu hỏi trong chapter và câu chưa từng làm.
- Không gọi một chapter là điểm yếu chính thức; P3 mới là nguồn quyết định weakness.
- Không tự thay đổi score hoặc learning state.
- Trả về đúng JSON, không markdown.

OUTPUT:
{
  "selectedQuestionIds": [number],
  "rationale": "string"
}

Chỉ trả tối đa ${context.desiredCount} id. Nếu không đủ candidate phù hợp, trả về số lượng ít hơn.

TARGET CHAPTERS:
${JSON.stringify(context.targetChapters)}

SOURCE SESSION:
${JSON.stringify({ score: context.sourceAttemptScore, total: context.sourceAttemptTotal })}

CANDIDATE SET:
${JSON.stringify(context.candidates)}`;
}

export function parseAdaptivePracticeResult(value: unknown): AdaptivePracticeResult | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const ids = Array.isArray(data.selectedQuestionIds)
    ? data.selectedQuestionIds.filter((id): id is number => Number.isInteger(id) && id > 0)
    : [];
  const rationale = typeof data.rationale === "string" ? data.rationale.trim() : "";

  return {
    selectedQuestionIds: [...new Set(ids)],
    rationale: rationale.slice(0, 300),
  };
}
