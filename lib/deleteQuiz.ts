import { supabase } from "@/lib/supabase";

export async function deleteQuiz(quizId: number): Promise<{ error: string | null }> {
  // Nhờ các khoá ngoại đã cấu hình ON DELETE CASCADE
  // (questions -> quizzes, bookmarks -> questions, notes -> questions),
  // chỉ cần xoá quiz là toàn bộ câu hỏi/bookmark/note liên quan sẽ tự động
  // bị xoá theo ở tầng database, không phụ thuộc RLS của các bảng con.
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

  if (error) {
    return { error: "Không thể xoá bộ đề: " + error.message };
  }

  return { error: null };
}