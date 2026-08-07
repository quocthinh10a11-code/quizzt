import { buildSystemSection } from "./system";
import { buildContextSection } from "./context";
import { buildModeSection } from "./mode";
import { buildSafetySection } from "./safety";
import type { TutorAnswerVisibility, TutorScreenContext, TutorQuestionContext, ReviewMeta } from "../types/tutor";

// prompts/ chỉ chịu trách nhiệm BUILD prompt, không export lại type.
// Nơi cần type phải import trực tiếp từ "@/lib/ai/types/tutor", không qua đây,
// để tránh coupling/dependency vòng giữa prompts và types khi kiến trúc mở rộng.

// Điểm ghép duy nhất — thứ tự CỐ ĐỊNH: System → Context → Mode → Safety.
// Safety luôn ở cuối để đè lên mọi chỉ thị giả trong Context (xem ghi chú trong safety.ts).
export function buildTutorPrompt(
  question: TutorQuestionContext,
  visibility: TutorAnswerVisibility,
  screenContext: TutorScreenContext,
  reviewMeta?: ReviewMeta
): string {
  const parts = [
    buildSystemSection(),
    buildContextSection(question, visibility, screenContext, reviewMeta),
    buildModeSection(visibility, screenContext),
    buildSafetySection(),
  ];

  return parts.join("\n\n");
}