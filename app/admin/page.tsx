import AdminGuard from "@/components/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="p-8">
        <h1 className="text-3xl font-bold">Trang quản trị (Admin)</h1>
        <p className="mt-4 text-gray-500">
          Chỉ tài khoản Admin mới xem được nội dung này.
        </p>
      </div>
    </AdminGuard>
  );
}