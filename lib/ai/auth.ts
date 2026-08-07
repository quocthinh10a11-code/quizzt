import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type AuthenticatedContext = {
  supabase: SupabaseClient;
  userId: string;
};

// Xác thực request dựa trên header "Authorization: Bearer <token>".
// KHÔNG tin bất kỳ userId nào client gửi trong body — userId trả về ở đây
// LUÔN được lấy từ token đã xác thực qua Supabase, không phải từ input tự khai.
//
// Trả về kèm 1 Supabase client đã gắn đúng token của người dùng (thay vì client
// "trần"), để các truy vấn tiếp theo (ví dụ ghi vào ai_usage_log) tự động chạy
// đúng dưới quyền auth.uid() của người dùng đó, tận dụng RLS đã có sẵn thay vì
// cần thêm service role key.
export async function getAuthenticatedContext(req: Request): Promise<AuthenticatedContext | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return { supabase, userId: data.user.id };
}