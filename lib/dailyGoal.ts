import { supabase } from "@/lib/supabase";

const DEFAULT_DAILY_GOAL = 20;

// Tính khoảng UTC tương ứng với "hôm nay" theo giờ Việt Nam (UTC+7),
// để đếm đúng số câu đã làm trong ngày theo giờ VN, không phải giờ UTC của server.
function getVnTodayRange(): { start: string; end: string } {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dateKey = vn.toISOString().slice(0, 10);
  return {
    start: new Date(`${dateKey}T00:00:00+07:00`).toISOString(),
    end: new Date(`${dateKey}T23:59:59.999+07:00`).toISOString(),
  };
}

export async function getDailyGoal(userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("daily_goal_questions")
    .eq("id", userId)
    .single();

  return data?.daily_goal_questions ?? DEFAULT_DAILY_GOAL;
}

export async function setDailyGoal(userId: string, value: number): Promise<{ error: string | null }> {
  const clamped = Math.min(500, Math.max(1, Math.round(value)));
  const { error } = await supabase
    .from("profiles")
    .update({ daily_goal_questions: clamped })
    .eq("id", userId);

  return { error: error?.message ?? null };
}

// Tổng số câu đã làm hôm nay, cộng dồn total_questions từ mọi lượt (quiz/bookmark/review_queue...)
export async function getTodayProgress(userId: string): Promise<number> {
  const { start, end } = getVnTodayRange();

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("total_questions")
    .eq("user_id", userId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + (row.total_questions ?? 0), 0);
}