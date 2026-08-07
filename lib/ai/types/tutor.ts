// Trục 1: Answer Visibility — do BACKEND quyết định duy nhất, dựa trên "submitted".
// Frontend không bao giờ được tự ý set giá trị này.
export type TutorAnswerVisibility = "hidden" | "revealed";

// Trục 2: Screen Context — độc lập với Answer Visibility, chỉ ảnh hưởng
// "chất liệu" prompt (có thêm dữ liệu Scheduler hay không, Quick Actions nào phù hợp).
// KHÔNG ảnh hưởng bảo mật.
export type TutorScreenContext = "practice" | "review" | "smart_review";

import type { ReviewSource } from "./common";

// Dữ liệu Scheduler — chỉ có giá trị khi screenContext = "smart_review".
export type ReviewMeta = {
  intervalDays: number;
  reviewCount: number;
  source: ReviewSource;
  daysSinceLastReview: number | null;
};

export type TutorQuestionContext = {
  content: string;
  options: string[];
  correctIndex?: number;
};

// Một nút gợi ý trong AI Tutor. "label" hiển thị trên nút, "prompt" là nội dung
// câu hỏi thật sự được gửi đi khi bấm — tách riêng để label ngắn gọn trong khi
// prompt gửi cho AI có thể đầy đủ ngữ cảnh hơn.
export type QuickAction = {
  label: string;
  prompt: string;
};