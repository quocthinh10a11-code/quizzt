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
  quizId: number | null;
  quizTitle: string;
  timeTakenSeconds: number | null;
  answers: AttemptAnswerInput[];
  attemptType?: AttemptType;
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
      attempt_type: params.attemptType ?? "quiz",
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
export type AttemptType = "quiz" | "bookmark" | "weak_topics" | "ai_generated" | "review_queue";

export type AttemptSummary = {
  id: number;
  quiz_id: number | null;
  quiz_title: string;
  total_questions: number;
  correct_count: number;
  time_taken_seconds: number | null;
  attempt_type: AttemptType;
  created_at: string;
};

export type UserAttemptsResult = {
  data: AttemptSummary[];
  error: string | null;
};

export async function getUserAttemptsResult(
  userId: string,
  attemptTypes?: AttemptType[],
  limit: number = 50
): Promise<UserAttemptsResult> {
  let query = supabase
    .from("quiz_attempts")
    .select("id, quiz_id, quiz_title, total_questions, correct_count, time_taken_seconds, attempt_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (attemptTypes && attemptTypes.length > 0) {
    query = query.in("attempt_type", attemptTypes);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { data: [], error: error?.message ?? "Không thể tải lịch sử học tập." };
  }

  return { data, error: null };
}

export async function getUserAttempts(
  userId: string,
  attemptTypes?: AttemptType[],
  limit: number = 50
): Promise<AttemptSummary[]> {
  const result = await getUserAttemptsResult(userId, attemptTypes, limit);
  return result.data;
}

const HISTORY_PAGE_SIZE = 20;

export async function getUserAttemptsPage(
  userId: string,
  page: number,
  attemptTypes?: AttemptType[]
): Promise<{ items: AttemptSummary[]; hasMore: boolean }> {
  const from = page * HISTORY_PAGE_SIZE;
  const to = from + HISTORY_PAGE_SIZE; // lấy dư 1 dòng để biết còn trang sau không

  let query = supabase
    .from("quiz_attempts")
    .select("id, quiz_id, quiz_title, total_questions, correct_count, time_taken_seconds, attempt_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (attemptTypes && attemptTypes.length > 0) {
    query = query.in("attempt_type", attemptTypes);
  }

  const { data, error } = await query;

  if (error || !data) return { items: [], hasMore: false };

  const hasMore = data.length > HISTORY_PAGE_SIZE;
  const items = hasMore ? data.slice(0, HISTORY_PAGE_SIZE) : data;

  return { items, hasMore };
}

export type AttemptDetailAnswer = {
  id: number;
  question_content: string;
  difficulty: string;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
};

export async function getAttemptDetail(
  attemptId: number
): Promise<{ summary: AttemptSummary | null; answers: AttemptDetailAnswer[] }> {
  const { data: summary } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, quiz_title, total_questions, correct_count, time_taken_seconds, attempt_type, created_at")
    .eq("id", attemptId)
    .single();

  const { data: answers } = await supabase
    .from("quiz_attempt_answers")
    .select("id, question_content, difficulty, selected_index, correct_index, is_correct")
    .eq("attempt_id", attemptId)
    .order("id");

  return { summary: summary ?? null, answers: answers ?? [] };
}
