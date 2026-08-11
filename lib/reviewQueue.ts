import { supabase } from "@/lib/supabase";

export type ReviewSource = "wrong_answer" | "bookmark" | "note" | "manual";

const MAX_INTERVAL_DAYS = 60;
const MAX_INTERVAL_DAYS_V2 = 180;

// Thêm 1 câu hỏi vào hàng đợi ôn tập. Nếu đã có sẵn (trùng user_id+question_id
// nhờ UNIQUE constraint), bỏ qua, không ghi đè để không mất tiến độ chu kỳ đang có.
export async function addToReviewQueue(
  userId: string,
  questionId: number,
  source: ReviewSource
): Promise<{ error: string | null; alreadyExists: boolean }> {
  const { data: existing } = await supabase
    .from("review_queue")
    .select("id")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    return { error: null, alreadyExists: true };
  }

  const { error } = await supabase.from("review_queue").insert({
    user_id: userId,
    question_id: questionId,
    source,
  });

  if (error) {
    return { error: "Không thể thêm vào ôn tập: " + error.message, alreadyExists: false };
  }

  return { error: null, alreadyExists: false };
}

export async function removeFromReviewQueue(
  userId: string,
  questionId: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("review_queue")
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (error) {
    return { error: "Không thể gỡ khỏi ôn tập: " + error.message };
  }
  return { error: null };
}

export async function isInReviewQueue(userId: string, questionId: number): Promise<boolean> {
  const { data } = await supabase
    .from("review_queue")
    .select("id")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  return !!data;
}

export async function getQuestionIdsInQueue(userId: string, questionIds: number[]): Promise<Set<number>> {
  if (questionIds.length === 0) return new Set();

  const { data } = await supabase
    .from("review_queue")
    .select("question_id")
    .eq("user_id", userId)
    .in("question_id", questionIds);

  return new Set((data ?? []).map((r) => r.question_id));
}

export type DueReviewQuestion = {
  reviewId: number;
  questionId: number;
  intervalDays: number;
  reviewCount: number;
  content: string;
  options: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
  quizId: number | null;
  quizTitle: string;
  lastReviewedAt: string | null;
  source: ReviewSource;
};

// Lấy các câu đã đến hạn ôn hôm nay (next_review_date <= hôm nay)
export async function getDueReviewQuestions(userId: string): Promise<DueReviewQuestion[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("review_queue")
    .select(
      "id, question_id, interval_days, review_count, last_reviewed_at, source, questions(content, options, correct_index, difficulty, quiz_id, quizzes(title))"
    )
    .eq("user_id", userId)
    .lte("next_review_date", today);

  if (error || !data) return [];

  return data
    .map((row: any) => {
      const q = row.questions;
      if (!q) return null;
      return {
        reviewId: row.id,
        questionId: row.question_id,
        intervalDays: row.interval_days,
        reviewCount: row.review_count,
        content: q.content,
        options: q.options,
        correctIndex: q.correct_index,
        difficulty: q.difficulty,
        quizId: q.quiz_id,
        quizTitle: q.quizzes?.title ?? "Bộ đề không xác định",
        lastReviewedAt: row.last_reviewed_at,
        source: row.source as ReviewSource,
      };
    })
    .filter(Boolean) as DueReviewQuestion[];
}

export async function getDueReviewCountResult(
  userId: string
): Promise<{ count: number; error: string | null }> {
  const today = new Date().toISOString().slice(0, 10);

  const { count, error } = await supabase
    .from("review_queue")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("next_review_date", today);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

// Số câu đến hạn hôm nay (dùng hiển thị badge nhanh, không cần load hết chi tiết)
export async function getDueReviewCount(userId: string): Promise<number> {
  const result = await getDueReviewCountResult(userId);
  return result.count;
}

// Cập nhật chu kỳ sau khi ôn xong 1 câu: đúng thì nhân đôi, sai thì reset về 1 ngày
export async function updateReviewProgress(
  reviewId: number,
  wasCorrect: boolean
): Promise<{ error: string | null }> {
  const { data: current, error: fetchError } = await supabase
    .from("review_queue")
    .select("interval_days, review_count")
    .eq("id", reviewId)
    .single();

  if (fetchError || !current) {
    return { error: "Không tìm thấy mục ôn tập." };
  }

  const newInterval = wasCorrect
    ? Math.min(current.interval_days * 2, MAX_INTERVAL_DAYS)
    : 1;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  const { error } = await supabase
    .from("review_queue")
    .update({
      interval_days: newInterval,
      review_count: current.review_count + 1,
      last_reviewed_at: new Date().toISOString(),
      next_review_date: nextReviewDate.toISOString().slice(0, 10),
    })
    .eq("id", reviewId);

  if (error) {
    return { error: "Không thể cập nhật tiến độ ôn tập: " + error.message };
  }

  return { error: null };
}

// ==== V2: Review Quality (Again/Hard/Good/Easy) — SM-2 rút gọn ====

export type ReviewQuality = "again" | "hard" | "good" | "easy";

export async function updateReviewProgressV2(
  reviewId: number,
  quality: ReviewQuality
): Promise<{ error: string | null }> {
  const { data: row, error: fetchError } = await supabase
    .from("review_queue")
    .select("interval_days, ease_factor, review_count")
    .eq("id", reviewId)
    .single();

  if (fetchError || !row) {
    return { error: "Không tìm thấy mục ôn tập." };
  }

  let intervalDays: number = row.interval_days;
  let easeFactor: number = row.ease_factor ?? 2.5;

  switch (quality) {
    case "again":
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      break;
    case "hard":
      intervalDays = Math.ceil(intervalDays * 1.2);
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      break;
    case "good":
      intervalDays = Math.ceil(intervalDays * easeFactor);
      break;
    case "easy":
      intervalDays = Math.ceil(intervalDays * easeFactor * 1.3);
      easeFactor = easeFactor + 0.15;
      break;
  }

  intervalDays = Math.min(MAX_INTERVAL_DAYS_V2, Math.max(1, intervalDays));

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  const { error } = await supabase
    .from("review_queue")
    .update({
      interval_days: intervalDays,
      ease_factor: easeFactor,
      review_count: row.review_count + 1,
      last_reviewed_at: new Date().toISOString(),
      next_review_date: nextReviewDate.toISOString().slice(0, 10),
    })
    .eq("id", reviewId);

  if (error) {
    return { error: "Không thể cập nhật tiến độ ôn tập: " + error.message };
  }

  return { error: null };
}
