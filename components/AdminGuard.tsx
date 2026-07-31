"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (profile && profile.role !== "admin") {
      router.push("/");
    }
  }, [user, profile, loading, router]);

  if (loading || !user || profile?.role !== "admin") {
    return <div className="p-8 text-center">Đang kiểm tra quyền truy cập...</div>;
  }

  return <>{children}</>;
}