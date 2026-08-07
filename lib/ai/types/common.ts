export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Dùng chung cho ReviewMeta (Tutor) và RecommendationItem (Recommendation, sẽ nối vào ở bước
// refactor Recommendation sau này) — đặt ở common.ts vì không thuộc riêng domain nào.
export type ReviewSource = "wrong_answer" | "bookmark" | "note" | "manual";