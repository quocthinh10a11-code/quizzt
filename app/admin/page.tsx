import { ShieldCheck, Settings2, Sparkles } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import Card from "@/components/ui/Card";

export default function AdminPage() {
  return (
    <AdminGuard>
      <main className="min-h-[calc(100vh-64px)] bg-gray-50/70 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-up">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <ShieldCheck size={14} /> Khu vực quản trị
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Trang quản trị</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Quản lý và theo dõi hệ thống Quizzt từ một không gian riêng.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="p-6 border-0 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Settings2 size={21} />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Không gian quản trị</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Các công cụ quản trị sẽ được đặt tại đây khi hệ thống mở rộng.</p>
            </Card>
            <Card className="p-6 border-0 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center mb-4">
                <Sparkles size={21} />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Quizzt đang phát triển</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Bạn đang ở khu vực dành riêng cho tài khoản có quyền quản trị.</p>
            </Card>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}