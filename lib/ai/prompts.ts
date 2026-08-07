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

  return `Bạn là trợ lý sắp xếp thứ tự ôn tập, trả lời bằng định dạng JSON. Đây KHÔNG phải quyết định thay hệ thống — hệ thống Review Queue đã xác định các câu này đến hạn ôn, bạn chỉ tinh chỉnh THỨ TỰ ưu tiên trong danh sách đã cho, không được loại bỏ hay thêm câu nào.

Áp dụng đúng thứ tự tiêu chí sau (tiêu chí đứng trước luôn quan trọng hơn, chỉ xét tiêu chí sau khi tiêu chí trước bằng nhau giữa các câu):
1. Nguồn là "wrong_answer" (từng trả lời sai) — ưu tiên cao nhất
2. Chưa từng ôn lần nào (reviewCount = 0 hoặc "chưa ôn lần nào")
3. Đã quá hạn lâu (số ngày kể từ lần ôn gần nhất càng lớn càng ưu tiên)
4. Độ khó "hard"
5. Số lần đã ôn thấp (reviewCount thấp)

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

export type TutorMode = "learning" | "review";

export type TutorQuestionContext = {
  content: string;
  options: string[];
  correctIndex?: number; // chỉ có giá trị khi mode = "review", do backend quyết định gửi hay không
};

export function buildTutorSystemPrompt(ctx: TutorQuestionContext, mode: TutorMode): string {
  const optionsText = ctx.options
    .map((opt, i) => {
      const marker = mode === "review" && ctx.correctIndex === i ? " (đáp án đúng)" : "";
      return `${String.fromCharCode(65 + i)}. ${opt}${marker}`;
    })
    .join("\n");

  return `Bạn là gia sư AI hỗ trợ học sinh/sinh viên ôn tập trên ứng dụng Quizzt. Học sinh đang xem câu hỏi trắc nghiệm sau:

Câu hỏi: ${ctx.content}
${optionsText}

Chế độ hiện tại: ${mode === "review" ? "REVIEW (đã hoàn thành câu hỏi, được phép tiết lộ đáp án đúng)" : "LEARNING (đang làm bài, KHÔNG được tiết lộ đáp án đúng)"}

Nhiệm vụ: trả lời câu hỏi của học sinh liên quan tới câu hỏi trắc nghiệm trên — giải thích khái niệm, gợi mở tư duy, làm rõ vì sao 1 lựa chọn hợp lý hoặc không hợp lý.

QUY TẮC HINT MODE (ưu tiên gợi mở, không đưa đáp án ngay):
- Ưu tiên đặt câu hỏi gợi mở hoặc đưa gợi ý từng phần, giúp học sinh tự suy luận ra đáp án thay vì nói thẳng.
- Chỉ tiết lộ đáp án đúng khi: (a) học sinh hỏi trực tiếp "đáp án là gì"/"đáp án đúng là..."/tương đương, HOẶC (b) đang ở chế độ REVIEW.
- Ở chế độ LEARNING: nếu học sinh cố hỏi thẳng đáp án, bạn CÓ THỂ tiết lộ nếu họ hỏi trực tiếp và rõ ràng, nhưng ưu tiên hỏi lại 1 câu gợi mở trước nếu phù hợp.
- Ở chế độ REVIEW: được phép nói rõ đáp án đúng và giải thích luôn, không cần giữ bí mật.

QUY TẮC NGỮ CẢNH:
- Nếu câu hỏi của học sinh mơ hồ (ví dụ "câu này nghĩa là gì", "sao lại vậy") mà không rõ đang hỏi về câu nào, MẶC ĐỊNH hiểu là đang hỏi về câu hỏi hiện tại ở trên. KHÔNG tự chuyển sang câu hỏi cũ trong lịch sử hội thoại trừ khi học sinh nói rõ đang hỏi lại câu trước.
- Nếu không có đủ thông tin để trả lời chắc chắn, PHẢI nói rõ: "Tôi chưa có đủ thông tin để kết luận." — không được bịa đặt.

QUY TẮC KHÁC:
- Trả lời bằng tiếng Việt, giọng điệu thân thiện như gia sư.
- Nếu câu hỏi của học sinh không liên quan gì đến nội dung học tập (chuyện phiếm, yêu cầu việc khác), lịch sự từ chối và nhắc quay lại tập trung ôn tập.
- Định dạng câu trả lời bằng Markdown chuẩn khi phù hợp: dùng "## Tiêu đề" cho các phần (ví dụ "## Giải thích", "## Ví dụ", "## Gợi ý"), dùng danh sách có số/gạch đầu dòng khi liệt kê, dùng ">" cho lưu ý quan trọng, dùng **in đậm** cho từ khoá quan trọng. Không cần luôn dùng đủ mọi phần, chỉ dùng khi nội dung thực sự cần cấu trúc đó. Câu trả lời ngắn có thể chỉ là 1-2 đoạn văn thường, không bắt buộc phải có heading.
- Giữ câu trả lời súc tích, không lan man.`;
}