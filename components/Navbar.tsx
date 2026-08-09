"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Layers,
  Bookmark,
  BookOpen,
  History,
  BarChart3,
  Brain,
  Sparkles,
  ArrowLeftRight,
  UserRoundPlus,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getDueReviewCount } from "@/lib/reviewQueue";
import {
  getRememberedAccounts,
  rememberAccount,
  type RememberedAccount,
} from "@/lib/accountSwitcher";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);
  const [switching, setSwitching] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }

      if (reviewRef.current && !reviewRef.current.contains(e.target as Node)) {
        setReviewOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      setDueCount(0);
      return;
    }

    getDueReviewCount(user.id).then(setDueCount);
    if (user.email) {
      rememberAccount(user.email);
      setAccounts(getRememberedAccounts());
    }
  }, [user?.id, user?.email]);

  const initial = (profile?.username ?? user?.email ?? "?")
    .charAt(0)
    .toUpperCase();

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function openAccountMenu() {
    setAccounts(getRememberedAccounts());
    setDropdownOpen((value) => !value);
  }

  async function switchAccount(email?: string) {
    if (switching) return;

    setSwitching(true);
    setDropdownOpen(false);
    setMobileOpen(false);

    if (email) {
      window.sessionStorage.setItem("quizzt:switch-email", email);
    } else {
      window.sessionStorage.removeItem("quizzt:switch-email");
    }

    await signOut();
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/75">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-[68px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-7 min-w-0">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="group flex items-center gap-2.5 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              aria-label="Quizzt - Trang chủ"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:rotate-2">
                <Sparkles size={18} strokeWidth={2.2} />
              </span>
              <span className="text-[19px] font-bold tracking-tight text-foreground">Quizzt</span>
            </Link>

            {user && (
              <div className="hidden lg:flex items-center gap-1">
                <Link href="/quizzes" className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-muted transition-colors">
                  <Layers size={16} className="text-muted group-hover:text-primary transition-colors" />
                  Bộ đề
                </Link>
                <Link href="/subjects" className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-muted transition-colors">
                  <BookOpen size={16} className="text-muted group-hover:text-primary transition-colors" />
                  Môn học
                </Link>
                <Link href="/stats" className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-muted transition-colors">
                  <BarChart3 size={16} className="text-muted group-hover:text-primary transition-colors" />
                  Thống kê
                </Link>
                <Link href="/history" className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-muted transition-colors">
                  <History size={16} className="text-muted group-hover:text-primary transition-colors" />
                  Lịch sử
                </Link>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {user && (
              <div className="relative" ref={reviewRef}>
                <button
                  onClick={() => setReviewOpen((value) => !value)}
                  aria-expanded={reviewOpen}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                    dueCount > 0
                      ? "text-primary bg-primary-soft hover:bg-primary/15"
                      : "text-muted hover:text-foreground hover:bg-surface-muted"
                  )}
                >
                  <Brain size={16} />
                  <span>Ôn tập</span>
                  {dueCount > 0 && (
                    <span className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold">{dueCount}</span>
                  )}
                  <ChevronDown size={14} className={cn("transition-transform duration-200", reviewOpen && "rotate-180")} />
                </button>

                {reviewOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-surface shadow-xl shadow-black/10 p-1.5 animate-scale-in">
                    <Link href="/smart-review" onClick={() => setReviewOpen(false)} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors">
                      <span className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-soft text-primary"><Brain size={16} /></span>
                        <span><span className="block font-medium">Ôn tập hôm nay</span><span className="block text-xs text-muted mt-0.5">Ôn lại kiến thức cần nhớ</span></span>
                      </span>
                      {dueCount > 0 && <span className="min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold">{dueCount}</span>}
                    </Link>
                    <Link href="/practice/bookmarks" onClick={() => setReviewOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-muted text-muted"><Bookmark size={16} /></span>
                      <span><span className="block font-medium">Câu đã đánh dấu</span><span className="block text-xs text-muted mt-0.5">Xem lại câu hỏi quan trọng</span></span>
                    </Link>
                    <Link href="/stats" onClick={() => setReviewOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-muted text-muted"><BarChart3 size={16} /></span>
                      <span><span className="block font-medium">Tiến độ học tập</span><span className="block text-xs text-muted mt-0.5">Xem điểm mạnh và điểm cần cải thiện</span></span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {user && <div className="w-px h-7 bg-border mx-1.5" />}

            <button
              onClick={toggleTheme}
              aria-label="Đổi giao diện sáng/tối"
              title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="relative ml-1.5" ref={dropdownRef}>
                <button
                  onClick={openAccountMenu}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-transparent hover:border-border hover:bg-surface-muted transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold shadow-sm">{initial}</span>
                  <span className="hidden md:block max-w-[110px] truncate text-sm font-medium text-foreground">{profile?.username ?? "..."}</span>
                  <ChevronDown size={14} className={cn("text-muted transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-surface shadow-xl shadow-black/10 p-1.5 animate-scale-in" role="menu">
                    <div className="px-3.5 py-3.5 mb-1 rounded-xl bg-gradient-to-br from-primary-soft to-surface-muted">
                      <p className="text-sm font-semibold text-foreground truncate">{profile?.username ?? "Tài khoản"}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">{user.email}</p>
                    </div>

                    <div className="px-3.5 pt-2 pb-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Tài khoản đã dùng</p>
                    </div>

                    <div className="space-y-0.5">
                      {accounts.map((account) => {
                        const isCurrent = account.email.toLowerCase() === (user.email ?? "").toLowerCase();
                        return (
                          <button
                            key={account.email}
                            type="button"
                            disabled={switching || isCurrent}
                            onClick={() => switchAccount(account.email)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                              isCurrent ? "bg-primary-soft cursor-default" : "hover:bg-surface-muted"
                            )}
                          >
                            <span className={cn("flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold", isCurrent ? "bg-primary text-white" : "bg-surface-muted text-muted")}>
                              {account.email.charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground truncate">{account.email}</span>
                              <span className="block text-[11px] text-muted mt-0.5">{isCurrent ? "Đang sử dụng" : "Nhấn để chuyển"}</span>
                            </span>
                            {isCurrent && <Check size={16} className="text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="h-px bg-border my-1.5" />

                    <button
                      type="button"
                      disabled={switching}
                      onClick={() => switchAccount()}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary-soft hover:text-primary transition-colors text-left disabled:opacity-60"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-muted"><UserRoundPlus size={16} /></span>
                      <span className="flex-1">Thêm tài khoản</span>
                      <ArrowLeftRight size={15} className="text-muted" />
                    </button>

                    <button
                      type="button"
                      disabled={switching}
                      onClick={() => switchAccount(user.email ?? undefined)}
                      className="w-full mt-0.5 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-foreground hover:bg-surface-muted transition-colors text-left disabled:opacity-60"
                    >
                      <ArrowLeftRight size={16} />
                      {switching ? "Đang chuyển tài khoản..." : "Chuyển tài khoản"}
                    </button>

                    <div className="h-px bg-border my-1.5" />

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger-soft transition-colors text-left"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="ml-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary-hover hover:-translate-y-px transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                Đăng nhập
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      <div className={cn("sm:hidden overflow-hidden border-t border-border transition-all duration-200", mobileOpen ? "max-h-[48rem] opacity-100" : "max-h-0 opacity-0 border-t-0")}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          {user && (
            <div className="flex items-center gap-3 p-3 mb-3 rounded-2xl bg-gradient-to-r from-primary-soft to-surface-muted border border-border">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white text-sm font-bold">{initial}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{profile?.username ?? "..."}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {user && (
              <Link href="/smart-review" onClick={closeMobileMenu} className="flex items-center justify-between px-3 py-3 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors">
                <span className="flex items-center gap-3"><Brain size={18} className="text-primary" /><span className="font-medium">Ôn tập hôm nay</span></span>
                {dueCount > 0 && <span className="min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold">{dueCount}</span>}
              </Link>
            )}
            {user && <Link href="/quizzes" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors"><Layers size={18} className="text-muted" /><span className="font-medium">Bộ đề của bạn</span></Link>}
            {user && <Link href="/subjects" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors"><BookOpen size={18} className="text-muted" /><span className="font-medium">Môn học</span></Link>}
            {user && <Link href="/stats" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors"><BarChart3 size={18} className="text-muted" /><span className="font-medium">Thống kê</span></Link>}
            {user && <Link href="/history" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors"><History size={18} className="text-muted" /><span className="font-medium">Lịch sử</span></Link>}

            {user && (
              <button type="button" onClick={() => switchAccount()} disabled={switching} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-foreground hover:bg-primary-soft hover:text-primary transition-colors text-left disabled:opacity-60">
                <ArrowLeftRight size={18} className="text-primary" />
                <span className="font-medium">{switching ? "Đang chuyển tài khoản..." : "Chuyển tài khoản"}</span>
              </button>
            )}

            <button type="button" onClick={toggleTheme} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-foreground hover:bg-surface-muted transition-colors text-left">
              {theme === "dark" ? <Sun size={18} className="text-muted" /> : <Moon size={18} className="text-muted" />}
              <span className="font-medium">{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</span>
            </button>

            {user && (
              <button type="button" onClick={() => { closeMobileMenu(); signOut(); }} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-danger hover:bg-danger-soft transition-colors text-left">
                <LogOut size={18} />
                <span className="font-medium">Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
