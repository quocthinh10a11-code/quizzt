"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/login");
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
            Tạo tài khoản mới
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Bắt đầu tự tạo bộ đề ôn tập của riêng bạn
          </p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <Input
            type="text"
            label="Tên người dùng"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

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
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            helperText="Ít nhất 6 ký tự"
          />

          {error && (
            <p className="text-sm text-danger bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2">
            Đăng ký
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      </Card>
    </div>
  );
}