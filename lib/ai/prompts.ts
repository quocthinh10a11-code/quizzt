export type RecommendationItem = {
  questionId: number;
  content: string;
  quizTitle: string;
  difficulty: "easy" | "medium" | "hard";
  intervalDays: number;
  reviewCount: number;
  source: string;
  daysSinceLastReview: number | null;
  // === Learning History (Phase 5 / Step 1) ===
  // Lịch sử làm bài TOÀN BỘ (không giới hạn "gần đây" — dự án chưa có business
  // rule định nghĩa "recent", xem Decision Required đã chốt). Đây CHỈ LÀ BỐI
  // CẢNH bổ sung cho AI viết "reason" tốt hơn — KHÔNG PHẢI tiêu chí xếp hạng.
  // 5 tiêu chí ưu tiên hiện tại trong buildRecommendationPrompt() giữ nguyên.
  wrongCount: number;
  correctCount: number;
  totalAttemptCount: number;
  lastAttemptAt: string | null;
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

      const historyText =
        item.totalAttemptCount === 0
          ? "chưa từng làm câu này trước đây"
          : `đã làm ${item.totalAttemptCount} lần (đúng ${item.correctCount}, sai ${item.wrongCount})`;

      return `${i + 1}. id=${item.questionId} | Bộ đề: "${item.quizTitle}" | Độ khó: ${item.difficulty} | Chu kỳ hiện tại: ${item.intervalDays} ngày | Số lần đã ôn: ${item.reviewCount} | Nguồn: ${item.source} | Ôn gần nhất: ${lastReview} | Lịch sử làm bài (chỉ để tham khảo bối cảnh, KHÔNG phải tiêu chí xếp hạng): ${historyText} | Nội dung: "${item.content.slice(0, 150)}"`;
    })
    .join("\n");

  return `Bạn là trợ lý sắp xếp thứ tự ôn tập, trả lời bằng định dạng JSON. Đây KHÔNG phải quyết định thay hệ thống — hệ thống Review Queue đã xác định các câu này đến hạn ôn, bạn chỉ tinh chỉnh THỨ TỰ ưu tiên trong danh sách đã cho, không được loại bỏ hay thêm câu nào.

Áp dụng đúng thứ tự tiêu chí sau (tiêu chí đứng trước luôn quan trọng hơn, chỉ xét tiêu chí sau khi tiêu chí trước bằng nhau giữa các câu):
1. Nguồn là "wrong_answer" (từng trả lời sai) — ưu tiên cao nhất
2. Chưa từng ôn lần nào (reviewCount = 0 hoặc "chưa ôn lần nào")
3. Đã quá hạn lâu (số ngày kể từ lần ôn gần nhất càng lớn càng ưu tiên)
4. Độ khó "hard"
5. Số lần đã ôn thấp (reviewCount thấp)

Lưu ý: mỗi câu có thêm "Lịch sử làm bài" — đây CHỈ LÀ BỐI CẢNH để bạn hiểu rõ hơn câu hỏi (ví dụ khi viết "reason"), TUYỆT ĐỐI KHÔNG dùng làm tiêu chí thứ 6 hay thay đổi thứ tự 5 tiêu chí ở trên.

Danh sách câu hỏi:
${lines}

Trả lời DUY NHẤT bằng JSON hợp lệ, không thêm chữ nào khác, không dùng markdown code block, đúng định dạng mảng:
[{"questionId": <số>, "priority": <thứ tự ưu tiên, 1 là ôn trước nhất>, "reason": "<lý do>"}]

Yêu cầu bắt buộc cho "reason":
- Dưới 20 từ
- Một dòng duy nhất, không xuống dòng
- Không dùng markdown (không **, không -, không #)
- Không dùng dấu ngoặc kép " bên trong nội dung reason

Phải trả về đủ ${items.length} phần tử, mỗi phần tử ứng đúng 1 questionId ở trên, không thêm không bớt.`;
}