import { supabase } from "@/lib/supabase";

export async function cloneQuiz(
  sourceQuizId: number,
  userId: string
): Promise<{ newQuizId: number | null; error: string | null }> {
  // 1. Lấy thông tin quiz gốc (title, description)
  const { data: sourceQuiz, error: quizFetchError } = await supabase
    .from("quizzes")
    .select("title, description")
    .eq("id", sourceQuizId)
    .single();

  if (quizFetchError || !sourceQuiz) {
    return { newQuizId: null, error: "Không tìm thấy bộ đề gốc." };
  }

  // 2. Lấy toàn bộ câu hỏi của quiz gốc
  const { data: sourceQuestions, error: questionsFetchError } = await supabase
    .from("questions")
    .select("content, options, correct_index, difficulty")
    .eq("quiz_id", sourceQuizId);

  if (questionsFetchError) {
    return { newQuizId: null, error: "Không đọc được câu hỏi gốc." };
  }

  // 3. Tạo quiz mới, thuộc user hiện tại
  const { data: newQuiz, error: insertQuizError } = await supabase
    .from("quizzes")
    .insert({
      title: `${sourceQuiz.title} (Bản sao)`,
      description: sourceQuiz.description,
      user_id: userId,
      is_public: false, // bản clone luôn riêng tư trước, user tự công khai sau nếu muốn
      chapter_id: null, // chapter thuộc user gốc, không mang sang được
    })
    .select()
    .single();

  if (insertQuizError || !newQuiz) {
    return { newQuizId: null, error: "Không thể tạo bộ đề mới: " + insertQuizError?.message };
  }

  // 4. Copy câu hỏi sang quiz mới (nếu có)
  if (sourceQuestions && sourceQuestions.length > 0) {
    const rows = sourceQuestions.map((q) => ({
      quiz_id: newQuiz.id,
      content: q.content,
      options: q.options,
      correct_index: q.correct_index,
      difficulty: q.difficulty,
    }));

    const { error: insertQuestionsError } = await supabase.from("questions").insert(rows);

    if (insertQuestionsError) {
      // Rollback: xoá quiz vừa tạo vì clone thất bại giữa chừng
      await supabase.from("quizzes").delete().eq("id", newQuiz.id);
      return { newQuizId: null, error: "Lỗi khi copy câu hỏi: " + insertQuestionsError.message };
    }
  }

  return { newQuizId: newQuiz.id, error: null };
}