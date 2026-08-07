import type { TutorAnswerVisibility, TutorScreenContext, TutorQuestionContext, ReviewMeta } from "../types/tutor";

// Context Section — mô tả câu hỏi hiện tại. Nội dung thay đổi theo CẢ 2 trục:
// - Answer Visibility quyết định có hiện đáp án đúng hay không
// - Screen Context quyết định có thêm dữ liệu Scheduler (Smart Review) hay không
export function buildContextSection(
  question: TutorQuestionContext,
  visibility: TutorAnswerVisibility,
  screenContext: TutorScreenContext,
  reviewMeta?: ReviewMeta
): string {
  const optionsText = question.options
    .map((opt, i) => {
      const marker = visibility === "revealed" && question.correctIndex === i ? " (đáp án đúng)" : "";
      return `${String.fromCharCode(65 + i)}. ${opt}${marker}`;
    })
    .join("\n");

  let section = `Học sinh đang xem câu hỏi trắc nghiệm sau:

Câu hỏi: ${question.content}
${optionsText}`;

  if (screenContext === "smart_review" && reviewMeta) {
    const lastReview =
      reviewMeta.daysSinceLastReview === null
        ? "chưa từng ôn lại lần nào"
        : `ôn lần gần nhất cách đây ${reviewMeta.daysSinceLastReview} ngày`;
    section += `

Bối cảnh ôn tập (Spaced Repetition): câu này đang trong chu kỳ ôn ${reviewMeta.intervalDays} ngày, đã ôn ${reviewMeta.reviewCount} lần, ${lastReview}, được thêm vào hàng đợi ôn tập vì lý do: ${reviewMeta.source === "wrong_answer" ? "học sinh từng trả lời sai" : reviewMeta.source === "bookmark" ? "học sinh tự đánh dấu để ôn lại" : reviewMeta.source === "note" ? "học sinh có ghi chú riêng cho câu này" : "được thêm thủ công"}.`;
  }

  return section;
}