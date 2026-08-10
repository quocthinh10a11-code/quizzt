"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, setRememberMe as setRememberMeFlag } from "@/lib/supabase";
import { rememberAccount, getRememberedAccounts } from "@/lib/accountSwitcher";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
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

  useEffect(() => {
    const switchEmail = window.sessionStorage.getItem("quizzt:switch-email");
    if (switchEmail) {
      setEmail(switchEmail);
      window.sessionStorage.removeItem("quizzt:switch-email");
      return;
    }

    const remembered = getRememberedAccounts()[0];
    if (remembered) setEmail(remembered.email);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setRememberMeFlag(rememberMe);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError("Email hoặc mật khẩu không đúng.");
      return;
    }

    if (rememberMe) rememberAccount(email);
    router.push("/");
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    setRememberMeFlag(true);

    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/` } });
    if (error) {
      setError("Không thể đăng nhập bằng Google. Vui lòng thử lại.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-68px)] flex items-center justify-center px-4 py-10 overflow-hidden bg-background">
      <div aria-hidden className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <Card className="relative w-full max-w-md p-6 sm:p-8 shadow-xl shadow-black/5 animate-fade-up">
        <div className="text-center mb-7">
          <Link href="/" className="text-2xl font-bold tracking-tight text-primary">Quizzt</Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Chào mừng trở lại</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted">Đăng nhập để tiếp tục hành trình ôn tập.</p>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} loading={googleLoading} leftIcon={!googleLoading && <GoogleIcon />}>Đăng nhập với Google</Button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">hoặc dùng email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input type="email" label="Email" placeholder="ban@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" label="Mật khẩu" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-muted cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20" />
              Ghi nhớ
            </label>
            <Link href="/forgot-password" className="text-primary font-medium hover:underline">Quên mật khẩu?</Link>
          </div>

          {error && <p role="alert" className="rounded-xl border border-danger/15 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-1">Đăng nhập</Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">Chưa có tài khoản? <Link href="/register" className="text-primary font-semibold hover:underline">Đăng ký miễn phí</Link></p>
      </Card>
    </div>
  );
}
