"use client";

import { Moon, Sun, Palette, Sparkles } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Card from "@/components/ui/Card";

export default function SettingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50/70 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-up">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Sparkles size={14} /> Cá nhân hóa
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Cài đặt</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Điều chỉnh Quizzt để việc học của bạn thoải mái và dễ tập trung hơn.
          </p>
        </div>

        <Card className="p-5 sm:p-6 border-0 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Palette size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 dark:text-white">Giao diện</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Chọn chế độ sáng hoặc tối phù hợp với môi trường học của bạn.
              </p>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Chuyển đổi giao diện sáng tối"
                className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                {theme === "light" ? "Chuyển sang Dark" : "Chuyển sang Light"}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}