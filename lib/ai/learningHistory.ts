import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestionLearningHistory = {
  wrongCount: number;
  correctCount: number;
  totalAttemptCount: number;
  lastAttemptAt: string | null;
};

const EMPTY_HISTORY: QuestionLearningHistory = {
  wrongCount: 0,
  correctCount: 0,
  totalAttemptCount: 0,
  lastAttemptAt: null,
};

// Lấy lịch sử làm bài (TOÀN BỘ lịch sử, không giới hạn "gần đây" - dự án hiện
// chưa có business rule định nghĩa "recent", xem Decision Required đã chốt)
// cho một tập question_id, giới hạn đúng user hiện tại (authenticated).
//
// MỘT query batch duy nhất cho cả danh sách câu hỏi, KHÔNG query riêng cho
// từng câu (tránh N+1).
//
// Learning history CHỈ LÀ dữ liệu bổ sung (context) cho Recommendation Step 1:
// - KHÔNG được dùng để quyết định tập câu hỏi (đó vẫn là việc của Review Queue)
// - KHÔNG được dùng làm tiêu chí xếp hạng mới trong prompt (xem lib/ai/prompts.ts)
export async function getLearningHistoryForQuestions(
  supabase: SupabaseClient,
  userId: string,
  questionIds: number[]
): Promise<Map<number, QuestionLearningHistory>> {
  const result = new Map<number, QuestionLearningHistory>();

  if (questionIds.length === 0) return result;

  const { data, error } = await supabase
    .from("quiz_attempt_answers")
    .select("question_id, is_correct, quiz_attempts!inner(user_id, created_at)")
    .eq("quiz_attempts.user_id", userId)
    .in("question_id", questionIds);

  if (error || !data) {
    // Fail-safe: nếu lấy lịch sử lỗi (sự cố hạ tầng), trả về map rỗng.
    // Nơi gọi sẽ tự điền history rỗng (0/0/0/null) cho mọi câu — Recommendation
    // vẫn chạy được, chỉ là thiếu context lịch sử, không phải lỗi chặn request.
    console.error("[learningHistory] Lỗi khi lấy lịch sử làm bài:", error?.message);
    return result;
  }

  const grouped = new Map<
    number,
    { wrong: number; correct: number; total: number; lastAt: string | null }
  >();

  for (const row of data as any[]) {
    const qId = row.question_id as number;
    const isCorrect = row.is_correct as boolean;
    const createdAt = row.quiz_attempts?.created_at as string | undefined;

    if (!grouped.has(qId)) {
      grouped.set(qId, { wrong: 0, correct: 0, total: 0, lastAt: null });
    }
    const entry = grouped.get(qId)!;
    entry.total += 1;
    if (isCorrect) entry.correct += 1;
    else entry.wrong += 1;
    if (createdAt && (!entry.lastAt || createdAt > entry.lastAt)) {
      entry.lastAt = createdAt;
    }
  }

  for (const [qId, entry] of grouped.entries()) {
    result.set(qId, {
      wrongCount: entry.wrong,
      correctCount: entry.correct,
      totalAttemptCount: entry.total,
      lastAttemptAt: entry.lastAt,
    });
  }

  return result;
}

// Trả về history của 1 question, hoặc history rỗng (0/0/0/null) nếu question
// chưa từng có lượt làm bài nào — KHÔNG tự chế dữ liệu.
export function getHistoryOrEmpty(
  map: Map<number, QuestionLearningHistory>,
  questionId: number
): QuestionLearningHistory {
  return map.get(questionId) ?? EMPTY_HISTORY;
}