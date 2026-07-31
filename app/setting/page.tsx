"use client";

import { useTheme } from "@/context/ThemeContext";

export default function SettingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Cài đặt</h1>

      <div className="flex items-center justify-between border rounded-lg p-4 border-gray-300 dark:border-gray-700">
        <span>Giao diện</span>

        <button
          onClick={toggleTheme}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          {theme === "light" ? "🌙 Chuyển sang Dark" : "☀️ Chuyển sang Light"}
        </button>
      </div>
    </div>
  );
}