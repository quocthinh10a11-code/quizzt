import { supabase } from "@/lib/supabase";

export type AttemptAnswerInput = {
  question_id: number;
  question_content: string;
  difficulty: string;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
};

export async function saveQuizAttempt(params: {
  userId: string;
  quizId: number;
  quizTitle: string;
  timeTakenSeconds: number | null;
  answers: AttemptAnswerInput[];
}): Promise<{ attemptId: number | null; error: string | null }> {
  const correctCount = params.answers.filter((a) => a.is_correct).length;

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: params.userId,
      quiz_id: params.quizId,
      quiz_title: params.quizTitle,
      total_questions: params.answers.length,
      correct_count: correctCount,
      time_taken_seconds: params.timeTakenSeconds,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return { attemptId: null, error: "Không thể lưu lượt làm bài: " + attemptError?.message };
  }

  const rows = params.answers.map((a) => ({
    attempt_id: attempt.id,
    question_id: a.question_id,
    question_content: a.question_content,
    difficulty: a.difficulty,
    selected_index: a.selected_index,
    correct_index: a.correct_index,
    is_correct: a.is_correct,
  }));

  const { error: answersError } = await supabase.from("quiz_attempt_answers").insert(rows);

  if (answersError) {
    return { attemptId: attempt.id, error: "Lỗi khi lưu chi tiết câu trả lời: " + answersError.message };
  }

  return { attemptId: attempt.id, error: null };
}