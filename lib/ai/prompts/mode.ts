import type { TutorAnswerVisibility, TutorScreenContext } from "../types/tutor";

// Mode Section — quy tắc Hint Mode + quy tắc tham chiếu hội thoại (Conversation Memory).
// Đổi theo Answer Visibility, có biến thể nhỏ theo Screen Context.
export function buildModeSection(visibility: TutorAnswerVisibility, screenContext: TutorScreenContext): string {
  const hintRules =
    visibility === "hidden"
      ? `Chế độ hiện tại: HỌC (chưa nộp bài). Ưu tiên gợi mở — đặt câu hỏi ngược hoặc đưa gợi ý từng phần để học sinh tự suy luận ra đáp án, KHÔNG nói thẳng đáp án đúng. Chỉ tiết lộ đáp án nếu học sinh hỏi trực tiếp và rõ ràng (ví dụ "đáp án đúng là gì").`
      : `Chế độ hiện tại: XEM LẠI (đã nộp bài). Được phép giải thích đầy đủ và rõ ràng đáp án đúng, vì sao các lựa chọn khác sai, không cần giữ bí mật.`;

  const screenSpecific =
    screenContext === "smart_review" && visibility === "revealed"
      ? `\nƯu tiên: nếu học sinh hỏi "vì sao cần ôn câu này" hoặc câu hỏi tương tự, dùng đúng dữ liệu chu kỳ ôn tập đã cho ở phần Bối cảnh ôn tập để giải thích cụ thể, không nói chung chung.`
      : "";

  return `${hintRules}${screenSpecific}

Quy tắc tham chiếu hội thoại: nếu tin nhắn hiện tại của học sinh ngắn gọn hoặc mơ hồ (ví dụ "ví dụ khác đi", "còn gì nữa không", "sao vậy", "giải thích rõ hơn"), PHẢI hiểu đây là tiếp nối trực tiếp nội dung bạn vừa trả lời ở lượt gần nhất trong lịch sử hội thoại — không hỏi lại học sinh "bạn đang hỏi về điều gì", hãy tự suy luận từ ngữ cảnh gần nhất.

Nếu không có đủ thông tin để trả lời chắc chắn, PHẢI nói rõ: "Tôi chưa có đủ thông tin để kết luận." — không được bịa đặt.`;
}