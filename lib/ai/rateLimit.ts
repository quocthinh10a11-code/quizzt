import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitEndpoint = "ask" | "recommend" | "insight";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

// Đếm số lượt gọi của user trong 60 giây qua cho đúng endpoint, so với ngưỡng cho phép.
// Nếu chưa vượt, ghi nhận lượt gọi hiện tại và trả về allowed=true.
//
// Lưu ý về race condition (đã ghi rõ trong Technical Debt Assessment):
// nếu 2 request cùng lúc tới trong khoảng vài mili-giây, cả 2 có thể đều pass
// bước đếm trước khi bước ghi log của request đầu kịp hoàn tất — chấp nhận
// rủi ro nhỏ này ở mức rate limit đơn giản (không dùng lock/transaction phức tạp).
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
    // Fail-open: nếu không kiểm tra được do lỗi hạ tầng, cho phép request đi qua
    // thay vì chặn nhầm người dùng hợp lệ vì sự cố không liên quan tới họ.
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
