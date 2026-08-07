import type { TutorScreenContext, QuickAction } from "./types/tutor";

type BuildQuickActionsParams = {
  screenContext: TutorScreenContext;
  submitted: boolean;
  // Chỉ có ý nghĩa khi submitted = true. undefined nếu chưa xác định
  // (ví dụ Practice trước khi nộp bài không có khái niệm đúng/sai).
  wasCorrect?: boolean;
};

// Điểm tính toán DUY NHẤT cho "màn nào thì nút nào" — 3 trang (Practice, Review,
// Smart Review) đều gọi hàm thuần này, không tự viết logic riêng, tránh trùng lặp.
export function buildQuickActions({ screenContext, submitted, wasCorrect }: BuildQuickActionsParams): QuickAction[] {
  if (!submitted) {
    const actions: QuickAction[] = [
      { label: "Cho mình gợi ý", prompt: "Cho mình một gợi ý để giải câu này, đừng nói thẳng đáp án." },
      { label: "Giải thích khái niệm", prompt: "Giải thích khái niệm liên quan đến câu hỏi này giúp mình." },
    ];
    if (screenContext === "smart_review") {
      actions.push({
        label: "Vì sao câu này cần ôn?",
        prompt: "Vì sao câu này lại xuất hiện trong danh sách cần ôn hôm nay?",
      });
    }
    return actions;
  }

  const actions: QuickAction[] = [
    { label: "Vì sao đáp án đúng", prompt: "Giải thích vì sao đáp án đúng lại đúng." },
  ];

  if (wasCorrect === false) {
    actions.push({ label: "Vì sao tôi sai", prompt: "Giải thích vì sao lựa chọn của mình bị sai." });
  }

  actions.push({ label: "Cho ví dụ khác", prompt: "Cho mình một ví dụ khác minh hoạ cho khái niệm này." });
  actions.push({ label: "Giải thích đơn giản hơn", prompt: "Giải thích lại đơn giản hơn, dễ hiểu hơn giúp mình." });

  if (screenContext === "smart_review") {
    actions.push({
      label: "Giải thích lịch ôn tập",
      prompt: "Vì sao Scheduler lại xếp câu này vào lịch ôn hôm nay?",
    });
  }

  return actions;
}