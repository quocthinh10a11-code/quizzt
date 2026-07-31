"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="bg-blue-600 dark:bg-blue-900 text-white px-8 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold">
        Quizzt
      </Link>

      <div className="flex gap-6 items-center">
        <Link href="/setting">Cài đặt</Link>

        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm">
              👤 {profile?.username ?? "..."}
              {profile?.role === "admin" && " (Admin)"}
            </span>
            <button
              onClick={signOut}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  );
}