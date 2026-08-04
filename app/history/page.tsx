"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { History as HistoryIcon, Clock } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { getUserAttempts, type AttemptSummary } from "@/lib/quizAttempts";

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    async function load() {
      setLoading(true);
      const data = await getUserAttempts(user!.id);
      setAttempts(data);
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Lịch sử làm bài
        </h1>

        {authLoading || loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-gray-500 dark:text-gray-400">
            <HistoryIcon size={40} className="mb-3 opacity-60" />
            <p className="font-medium">Bạn chưa làm bài lượt nào</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {attempts.map((a) => {
              const percent = Math.round((a.correct_count / a.total_questions) * 100);
              const variant = percent >= 80 ? "success" : percent >= 50 ? "warning" : "danger";
              return (
                <Link key={a.id} href={`/history/${a.id}`}>
                  <Card hoverable className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {a.quiz_title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-3">
                        <span>
                          {new Date(a.created_at).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {formatDuration(a.time_taken_seconds)}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={variant}>
                        {a.correct_count}/{a.total_questions} ({percent}%)
                      </Badge>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}