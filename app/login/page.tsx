"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, setRememberMe as setRememberMeFlag } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.23 0 12 0 7.31 0 3.25 2.69 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    setRememberMeFlag(rememberMe); // set cờ TRƯỚC khi đăng nhập, để session lưu đúng chỗ

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email hoặc mật khẩu không đúng.");
      return;
    }

    router.push("/");
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    // Đăng nhập Google không có bước chọn "Ghi nhớ" giữa chừng (redirect sang Google rồi quay lại),
    // nên mặc định ghi nhớ luôn, giống hành vi phổ biến của các app khác.
    setRememberMeFlag(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setError("Không thể đăng nhập bằng Google. Vui lòng thử lại.");
      setGoogleLoading(false);
    }
    // Không cần set loading false khi thành công vì trình duyệt sẽ điều hướng sang Google ngay
  }

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 overflow-hidden">
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />

      <Card className="relative w-full max-w-md p-8 animate-fade-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary">
            Quizzt
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-black dark:text-white">
            Chào mừng trở lại
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Đăng nhập để tiếp tục ôn tập
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          loading={googleLoading}
          leftIcon={!googleLoading && <GoogleIcon />}
        >
          Đăng nhập với Google
        </Button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400 dark:text-gray-500">hoặc</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            placeholder="ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Mật khẩu"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary/20"
              />
              Ghi nhớ đăng nhập
            </label>

            <Link href="/forgot-password" className="text-primary hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          {error && (
            <p className="text-sm text-danger bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2">
            Đăng nhập
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </Card>
    </div>
  );
}