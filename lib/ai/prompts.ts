export type RecommendationItem = {
  questionId: number;
  content: string;
  quizTitle: string;
  difficulty: "easy" | "medium" | "hard";
  intervalDays: number;
  reviewCount: number;
  source: string;
  daysSinceLastReview: number | null;
};

export type RecommendationResult = {
  questionId: number;
  priority: number;
  reason: string;
};

export function buildRecommendationPrompt(items: RecommendationItem[]): string {
  const lines = items
    .map((item, i) => {
      const lastReview =
        item.daysSinceLastReview === null ? "chưa ôn lần nào" : `${item.daysSinceLastReview} ngày trước`;
      return `${i + 1}. id=${item.questionId} | Bộ đề: "${item.quizTitle}" | Độ khó: ${item.difficulty} | Chu kỳ hiện tại: ${item.intervalDays} ngày | Số lần đã ôn: ${item.reviewCount} | Nguồn: ${item.source} | Ôn gần nhất: ${lastReview} | Nội dung: "${item.content.slice(0, 150)}"`;
    })
    .join("\n");

  return `Bạn là trợ lý học tập, trả lời bằng định dạng JSON. Ưu tiên thứ tự ôn tập các câu hỏi dưới đây. Nguyên tắc: câu có nguy cơ quên cao hơn (chu kỳ ngắn, lâu chưa ôn lại, số lần ôn thấp, độ khó cao, nguồn thêm là trả lời sai) nên ôn trước.

Danh sách câu hỏi:
${lines}

Trả lời DUY NHẤT bằng JSON hợp lệ, không thêm chữ nào khác, không dùng markdown code block, đúng định dạng mảng:
[{"questionId": <số>, "priority": <thứ tự ưu tiên, 1 là ôn trước nhất>, "reason": "<lý do ngắn gọn tiếng Việt, dưới 20 từ>"}]

Phải trả về đủ ${items.length} phần tử, mỗi phần tử ứng đúng 1 questionId ở trên, không thêm không bớt.`;
}

export type TutorQuestionContext = {
  content: string;
  options: string[];
  correctIndex: number;
};

export function buildTutorSystemPrompt(ctx: TutorQuestionContext): string {
  const optionsText = ctx.options
    .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}${i === ctx.correctIndex ? " (đáp án đúng)" : ""}`)
    .join("\n");

  return `Bạn là gia sư AI hỗ trợ học sinh/sinh viên ôn tập trên ứng dụng Quizzt. Học sinh đang xem câu hỏi trắc nghiệm sau:

Câu hỏi: ${ctx.content}
${optionsText}

Nhiệm vụ của bạn: trả lời các câu hỏi của học sinh liên quan đến câu hỏi trên — giải thích vì sao đáp án đúng, vì sao các đáp án khác sai, làm rõ khái niệm liên quan, cho ví dụ dễ hiểu.

Yêu cầu:
- Trả lời bằng tiếng Việt, ngắn gọn, súc tích (dưới 150 từ mỗi lần trả lời), giọng điệu thân thiện như gia sư.
- Không tiết lộ đáp án đúng nếu học sinh chưa tự nhận ra, TRỪ KHI học sinh hỏi thẳng "đáp án đúng là gì" hoặc đã có vẻ biết đáp án qua ngữ cảnh câu hỏi.
- Nếu câu hỏi của học sinh không liên quan gì đến nội dung bài học (ví dụ hỏi chuyện phiếm, yêu cầu làm việc khác), lịch sự từ chối và nhắc học sinh quay lại tập trung ôn tập.
- Không bịa đặt thông tin không chắc chắn — nếu không chắc, nói rõ giới hạn hiểu biết của bạn.`;
}