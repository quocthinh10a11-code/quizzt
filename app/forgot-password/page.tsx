"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
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
            Quên mật khẩu
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Nhập email, chúng tôi sẽ gửi link đặt lại mật khẩu
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Đã gửi link đặt lại mật khẩu tới <strong>{email}</strong>. Kiểm tra hộp thư
              (kể cả mục spam) và bấm vào link trong email.
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="Email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-danger bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Gửi link đặt lại mật khẩu
            </Button>

            <Link href="/login" className="text-center text-sm text-primary hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </form>
        )}
      </Card>
    </div>
  );
}