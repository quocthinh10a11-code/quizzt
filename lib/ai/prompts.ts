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