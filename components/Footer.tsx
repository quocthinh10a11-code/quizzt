import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-lg font-bold text-primary">Quizzt</span>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tự tạo bộ đề, tự ôn tập, tự tiến bộ.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/quizzes" className="hover:text-primary transition-colors">
            Bộ đề
          </Link>
          <Link href="/setting" className="hover:text-primary transition-colors">
            Cài đặt
          </Link>
        </div>

        <p className="text-sm text-gray-400 dark:text-gray-500">
          © {year} Quizzt — Nguyễn Quốc Thịnh
        </p>
      </div>
    </footer>
  );
}