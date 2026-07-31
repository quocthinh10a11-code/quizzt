import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cờ quyết định "Ghi nhớ đăng nhập" - luôn nằm trong localStorage
// (bản thân cờ này phải bền, không phụ thuộc chính nó)
const REMEMBER_FLAG_KEY = "quizzt-remember-me";

export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_FLAG_KEY, remember ? "true" : "false");
}

function getActiveStorage(): Storage {
  const remember = window.localStorage.getItem(REMEMBER_FLAG_KEY);
  // Mặc định (chưa từng chọn) coi như "nhớ", giữ đúng hành vi cũ trước khi có tính năng này
  return remember === "false" ? window.sessionStorage : window.localStorage;
}

// Storage tuỳ chỉnh cho Supabase: đọc/ghi vào đúng nơi (localStorage hoặc sessionStorage)
// tuỳ theo lựa chọn Remember Me tại thời điểm đăng nhập.
const customAuthStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return null;
    return getActiveStorage().getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return;
    getActiveStorage().setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") return;
    // Xoá cả 2 nơi cho chắc, phòng khi user đổi lựa chọn giữa các lần đăng nhập
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});