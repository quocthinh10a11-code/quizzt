"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

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

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 overflow-hidden">
      {/* Background tinh tế: 1 khối gradient mờ phía sau card, không dùng ảnh */}
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