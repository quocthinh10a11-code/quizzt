import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type AuthenticatedContext = {
  supabase: SupabaseClient;
  userId: string;
};

// Xác thực request dựa trên header "Authorization: Bearer <token>".
// KHÔNG tin bất kỳ userId nào client gửi trong body.
// userId LUÔN được lấy từ token đã xác thực qua Supabase.
//
// Supabase client được gắn access token của người dùng để các truy vấn
// tiếp theo (ví dụ ai_usage_log) chạy đúng dưới quyền auth.uid(),
// tận dụng RLS thay vì sử dụng service role key.
export async function getAuthenticatedContext(
  req: Request
): Promise<AuthenticatedContext | null> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return {
    supabase,
    userId: data.user.id,
  };
}