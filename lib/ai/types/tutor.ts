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
  correctIndex?: number; // chỉ có giá trị khi visibility = "revealed", do backend gán
};