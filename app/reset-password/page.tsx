"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function ResetPasswordPage() {
  const router = useRouter();

  // Chờ Supabase tự nhận diện session "recovery" từ link trong email
  // (được tạo ra tự động khi trang này load với token trên URL)
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Phòng trường hợp session recovery đã có sẵn trước khi listener kịp gắn
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
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
            Đặt mật khẩu mới
          </h1>
        </div>

        {!ready && !done && (
          <p className="text-center text-sm text-muted">
            Đang xác thực link đặt lại mật khẩu...
          </p>
        )}

        {ready && !done && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              label="Mật khẩu mới"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              type="password"
              label="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-danger bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Cập nhật mật khẩu
            </Button>
          </form>
        )}

        {done && (
          <p className="text-center text-sm text-success">
            Đổi mật khẩu thành công! Đang chuyển tới trang đăng nhập...
          </p>
        )}

        {!ready && !done && (
          <Link href="/forgot-password" className="mt-6 block text-center text-sm text-primary hover:underline">
            Link không hợp lệ? Gửi lại
          </Link>
        )}
      </Card>
    </div>
  );
}