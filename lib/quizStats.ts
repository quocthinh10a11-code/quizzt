import { supabase } from "@/lib/supabase";
import { getUserAttempts } from "@/lib/quizAttempts";

export type DifficultyStat = {
  difficulty: string;
  total: number;
  correct: number;
};

export type QuizStat = {
  quizId: number | null;
  quizTitle: string;
  total: number;
  correct: number;
  attemptCount: number;
};

// Thống kê đúng/sai theo độ khó, dựa trên toàn bộ câu đã làm (mọi lượt)
export async function getDifficultyStats(userId: string): Promise<DifficultyStat[]> {
  const { data, error } = await supabase
    .from("quiz_attempt_answers")
    .select("difficulty, is_correct, quiz_attempts!inner(user_id, attempt_type)")
    .eq("quiz_attempts.user_id", userId)
    .eq("quiz_attempts.attempt_type", "quiz");
  if (error || !data) return [];

  const map: Record<string, { total: number; correct: number }> = {};
  data.forEach((row: any) => {
    const d = row.difficulty ?? "medium";
    if (!map[d]) map[d] = { total: 0, correct: 0 };
    map[d].total += 1;
    if (row.is_correct) map[d].correct += 1;
  });

  const order = ["easy", "medium", "hard"];
  return Object.entries(map)
    .map(([difficulty, v]) => ({ difficulty, ...v }))
    .sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
}

// Thống kê tỷ lệ đúng theo từng bộ đề, gộp toàn bộ lượt làm bài của bộ đề đó
export async function getQuizStats(userId: string): Promise<QuizStat[]> {
  const attempts = await getUserAttempts(userId, ["quiz"]);
  const map = new Map<string, QuizStat>();

  attempts.forEach((a) => {
    const key = a.quiz_id !== null ? `quiz:${a.quiz_id}` : `deleted:${a.quiz_title}`;
    if (!map.has(key)) {
      map.set(key, {
        quizId: a.quiz_id,
        quizTitle: a.quiz_title,
        total: 0,
        correct: 0,
        attemptCount: 0,
      });
    }
    const s = map.get(key)!;
    s.total += a.total_questions;
    s.correct += a.correct_count;
    s.attemptCount += 1;
  });

  return Array.from(map.values()).sort((a, b) => a.correct / a.total - b.correct / b.total);
}