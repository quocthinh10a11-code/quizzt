"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History as HistoryIcon, Clock, ChevronDown, ChevronUp } from "lucide-react";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type QuizGroup = {
  key: string;
  quizId: number | null;
  quizTitle: string;
  attempts: AttemptSummary[];
};

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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

  const groups = useMemo<QuizGroup[]>(() => {
    const map = new Map<string, QuizGroup>();

    for (const a of attempts) {
      const key = a.quiz_id !== null ? `quiz:${a.quiz_id}` : `deleted:${a.quiz_title}`;
      if (!map.has(key)) {
        map.set(key, { key, quizId: a.quiz_id, quizTitle: a.quiz_title, attempts: [] });
      }
      map.get(key)!.attempts.push(a);
    }

    // Mỗi nhóm giữ nguyên thứ tự mới nhất trước (vì attempts gốc đã sort desc)
    // Sắp xếp các nhóm theo lần làm gần nhất
    return Array.from(map.values()).sort((a, b) => {
      const latestA = a.attempts[0]?.created_at ?? "";
      const latestB = b.attempts[0]?.created_at ?? "";
      return latestB.localeCompare(latestA);
    });
  }, [attempts]);

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
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-gray-500 dark:text-gray-400">
            <HistoryIcon size={40} className="mb-3 opacity-60" />
            <p className="font-medium">Bạn chưa làm bài lượt nào</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => {
              const isExpanded = expandedKey === group.key;
              const bestPercent = Math.max(
                ...group.attempts.map((a) => Math.round((a.correct_count / a.total_questions) * 100))
              );
              const latest = group.attempts[0];

              return (
                <Card key={group.key} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedKey(isExpanded ? null : group.key)}
                    className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {group.quizTitle}
                        {group.quizId === null && (
                          <span className="text-xs text-gray-400 font-normal ml-2">
                            (bộ đề đã bị xoá)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {group.attempts.length} lượt làm bài · Gần nhất {formatDate(latest.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <Badge variant={bestPercent >= 80 ? "success" : bestPercent >= 50 ? "warning" : "danger"}>
                        Cao nhất {bestPercent}%
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                      {group.attempts.map((a) => {
                        const percent = Math.round((a.correct_count / a.total_questions) * 100);
                        const variant = percent >= 80 ? "success" : percent >= 50 ? "warning" : "danger";
                        return (
                          <Link key={a.id} href={`/history/${a.id}`}>
                            <div className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <div className="min-w-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {formatDate(a.created_at)}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                  <Clock size={11} /> {formatDuration(a.time_taken_seconds)}
                                </p>
                              </div>
                              <Badge variant={variant}>
                                {a.correct_count}/{a.total_questions} ({percent}%)
                              </Badge>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}