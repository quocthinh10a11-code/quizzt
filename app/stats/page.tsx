"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, TrendingDown } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getDifficultyStats, getQuizStats, type DifficultyStat, type QuizStat } from "@/lib/quizStats";
import StreakHeatmap from "@/components/stats/StreakHeatmap";
import DailyGoalCard from "@/components/stats/DailyGoalCard";

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "bg-success",
  medium: "bg-warning",
  hard: "bg-danger",
};

function percent(correct: number, total: number) {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth();
  const [difficultyStats, setDifficultyStats] = useState<DifficultyStat[]>([]);
  const [quizStats, setQuizStats] = useState<QuizStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    async function load() {
      setLoading(true);
      const [diff, quiz] = await Promise.all([
        getDifficultyStats(user!.id),
        getQuizStats(user!.id),
      ]);
      setDifficultyStats(diff);
      setQuizStats(quiz);
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  const weakestQuizzes = quizStats.filter((q) => q.total > 0).slice(0, 5);
  const totalAnswered = difficultyStats.reduce((sum, d) => sum + d.total, 0);

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Thống kê học tập
        </h1>

        {user && (
          <div className="mb-6">
            <DailyGoalCard userId={user.id} />
          </div>
        )}

        {authLoading || loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        ) : totalAnswered === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-gray-500 dark:text-gray-400">
            <BarChart3 size={40} className="mb-3 opacity-60" />
            <p className="font-medium">Chưa có dữ liệu thống kê</p>
            <p className="text-sm mt-1">Hãy làm vài bộ đề để xem thống kê tại đây.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {user && <StreakHeatmap userId={user.id} />}

            {/* Thống kê theo độ khó */}
            <Card className="p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                Tỷ lệ đúng theo độ khó
              </h2>
              <div className="flex flex-col gap-4">
                {difficultyStats.map((d) => {
                  const pct = percent(d.correct, d.total);
                  return (
                    <div key={d.difficulty}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {DIFFICULTY_LABEL[d.difficulty] ?? d.difficulty}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {d.correct}/{d.total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${DIFFICULTY_COLOR[d.difficulty] ?? "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Bộ đề yếu nhất */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={18} className="text-danger" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Bộ đề cần ôn lại nhiều nhất
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {weakestQuizzes.map((q) => {
                  const pct = percent(q.correct, q.total);
                  return (
                    <div
                      key={q.quizId ?? q.quizTitle}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {q.quizTitle}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {q.correct}/{q.total} câu đúng · {q.attemptCount} lượt làm
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <span
                          className={`text-sm font-semibold ${
                            pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger"
                          }`}
                        >
                          {pct}%
                        </span>
                        {q.quizId !== null && (
                          <Link href={`/practice/${q.quizId}`}>
                            <Button size="sm" variant="outline">
                              Làm lại
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}