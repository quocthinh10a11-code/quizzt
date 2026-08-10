"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenCheck, Target, TrendingDown } from "lucide-react";
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
  const totalCorrect = difficultyStats.reduce((sum, d) => sum + d.correct, 0);
  const overallPercent = percent(totalCorrect, totalAnswered);

  return (
    <RequireAuth>
      <main className="min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <BarChart3 size={14} />
                Tiến độ của bạn
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Thống kê học tập
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted max-w-2xl">
                Nhìn lại quá trình học, nhận ra điểm mạnh và biết mình nên ôn phần nào tiếp theo.
              </p>
            </div>
            <Link href="/quizzes">
              <Button variant="outline" className="w-full sm:w-auto">
                Khám phá bộ đề <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>

          {user && <DailyGoalCard userId={user.id} />}

          {authLoading || loading ? (
            <div className="grid gap-5 lg:grid-cols-2 mt-5">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
            </div>
          ) : totalAnswered === 0 ? (
            <Card className="mt-5 overflow-hidden border-0 shadow-sm">
              <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <BookOpenCheck size={28} />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Hành trình của bạn sắp bắt đầu</h2>
                <p className="text-sm text-muted mt-2 max-w-md">
                  Hãy hoàn thành một vài câu hỏi. Quizzt sẽ biến kết quả thành những thống kê dễ hiểu để bạn biết nên học gì tiếp theo.
                </p>
                <Link href="/quizzes" className="mt-5">
                  <Button>Thử một bộ đề</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Card className="p-5 sm:p-6 border-0 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted">Tổng số câu đã làm</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{totalAnswered}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <BookOpenCheck size={21} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">Tính trên tất cả lượt luyện tập đã ghi nhận</p>
              </Card>

              <Card className="p-5 sm:p-6 border-0 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted">Tỷ lệ đúng tổng thể</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{overallPercent}%</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <Target size={21} />
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${overallPercent}%` }} />
                </div>
              </Card>

              {user && <div className="lg:col-span-2"><StreakHeatmap userId={user.id} /></div>}

              <Card className="p-5 sm:p-6 border-0 shadow-sm">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Năng lực</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Theo độ khó</h2>
                </div>
                <div className="flex flex-col gap-5">
                  {difficultyStats.map((d) => {
                    const pct = percent(d.correct, d.total);
                    return (
                      <div key={d.difficulty}>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-foreground/80 font-medium">{DIFFICULTY_LABEL[d.difficulty] ?? d.difficulty}</span>
                          <span className="font-semibold text-foreground/80">{pct}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
                          <div className={`h-full rounded-full ${DIFFICULTY_COLOR[d.difficulty] ?? "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs text-muted">{d.correct}/{d.total} câu đúng</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-5 sm:p-6 border-0 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-danger">Gợi ý ôn tập</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">Bộ đề cần luyện thêm</h2>
                  </div>
                  <TrendingDown size={19} className="text-danger mt-1" />
                </div>
                <div className="flex flex-col gap-2">
                  {weakestQuizzes.map((q) => {
                    const pct = percent(q.correct, q.total);
                    return (
                      <div key={q.quizId ?? q.quizTitle} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{q.quizTitle}</p>
                          <p className="text-xs text-muted mt-0.5">{q.correct}/{q.total} đúng · {q.attemptCount} lượt</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-sm font-semibold ${pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger"}`}>{pct}%</span>
                          {q.quizId !== null && (
                            <Link href={`/practice/${q.quizId}`}>
                              <Button size="sm" variant="outline">Làm lại</Button>
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
      </main>
    </RequireAuth>
  );
}
