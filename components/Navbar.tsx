"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, ChevronDown, LogOut, Settings, Shield, Menu, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = (profile?.username ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary shrink-0">
            Quizzt
          </Link>
          {user && (
            <Link
              href="/quizzes"
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
            >
              <Layers size={15} />
              Bộ đề của bạn
            </Link>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <Link
              href="/setting"
              aria-label="Cài đặt"
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              <Settings size={18} />
            </Link>
          )}

          {user ? (
            <div className="relative ml-2" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                  {initial}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                  {profile?.username ?? "..."}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg py-1 animate-fade-up">
                  {profile?.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Shield size={15} /> Quản trị
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        {/* Mobile toggle button */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="sm:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Mở menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "sm:hidden overflow-hidden transition-all duration-200 border-t border-gray-200 dark:border-gray-800",
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0 border-t-0"
        )}
      >
        <div className="px-4 py-3 flex flex-col gap-1">
          {user && (
            <Link
              href="/quizzes"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Layers size={16} /> Bộ đề đã tạo
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
          </button>

          {user ? (
            <>
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Shield size={16} /> Quản trị
                </Link>
              )}
              <Link
                href="/setting"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Settings size={16} /> Cài đặt
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 px-2 py-2 text-sm text-danger rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="bg-primary text-white text-center px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}