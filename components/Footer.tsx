import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-lg font-bold text-primary">Quizzt</span>
          <p className="mt-1 text-sm text-muted">Tự tạo bộ đề, tự ôn tập, tự tiến bộ.</p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted">
          <Link href="/quizzes" className="hover:text-primary transition-colors">Bộ đề</Link>
          <Link href="/study-plan" className="hover:text-primary transition-colors">Kế hoạch học</Link>
          <Link href="/setting" className="hover:text-primary transition-colors">Cài đặt</Link>
        </div>

        <p className="text-sm text-muted">© {year} Quizzt</p>
      </div>
    </footer>
  );
}
