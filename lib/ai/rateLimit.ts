import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitEndpoint = "ask" | "recommend" | "insight" | "adaptive_practice" | "study_plan";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

// Đếm số lượt gọi của user trong 60 giây qua đúng endpoint, so với ngưỡng cho phép.
export async function checkAndRecordRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: RateLimitEndpoint,
  limitPerMinute: number
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if (countError) {
    console.error("[rateLimit] Lỗi khi đếm lượt gọi:", countError.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= limitPerMinute) {
    return { allowed: false, retryAfterSeconds: 60 };
  }

  const { error: insertError } = await supabase.from("ai_usage_log").insert({ user_id: userId, endpoint });
  if (insertError) {
    console.error("[rateLimit] Lỗi khi ghi log lượt gọi:", insertError.message);
  }

  return { allowed: true };
}
