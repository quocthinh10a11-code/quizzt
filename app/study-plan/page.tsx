"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, RefreshCw } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import type { StudyPlan } from "@/lib/ai/studyPlan";

type ApiResponse = {
  plan?: StudyPlan;
  source?: "ai" | "fallback";
  error?: string;
};

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [source, setSource] = useState<ApiResponse["source"]>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setLoading(false);
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      const response = await fetch("/api/ai/study-plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ durationDays: 7 }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.plan) {
        setError(data.error ?? "Không thể tạo kế hoạch học tập lúc này.");
        return;
      }

      setPlan(data.plan);
      setSource(data.source);
    } catch {
      setError("Không thể kết nối tới dịch vụ lập kế hoạch.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  return (
    <RequireAuth>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <section className="mb-8">
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <CalendarDays size={18} />
            <span>Kế hoạch học tập cá nhân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">7 ngày học tiếp theo</h1>
          <p className="text-muted mt-2 max-w-2xl">
            Kế hoạch được xây từ tiến độ ôn tập, điểm yếu và hoạt động học gần đây của bạn.
          </p>
        </section>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Chưa thể tạo kế hoạch</h2>
            <p className="text-muted mt-2">{error}</p>
            <div className="mt-5">
              <Button variant="primary" onClick={() => void loadPlan()} leftIcon={<RefreshCw size={16} />}>
                Thử lại
              </Button>
            </div>
          </Card>
        ) : plan ? (
          <>
            <Card className="p-5 sm:p-6 mb-6 border-primary/20 bg-primary/5 dark:bg-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">Tóm tắt</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{plan.summary}</p>
                </div>
                {source === "fallback" && (
                  <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-surface-muted text-muted">
                    Kế hoạch dự phòng
                  </span>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              {plan.days.map((day) => (
                <Card key={day.day} className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-bold">
                      {day.day}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ngày {day.day}</p>
                      <h2 className="text-lg font-semibold text-foreground mt-1">{day.focus}</h2>
                      <p className="text-sm text-muted mt-1">{day.reason}</p>

                      {day.actions.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {day.actions.map((action) => (
                            <Link
                              key={`${day.day}-${action.id}`}
                              href={action.target}
                              className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted/40 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground">{action.title}</span>
                                <span className="block text-xs text-muted mt-0.5">{action.reason}</span>
                              </span>
                              <ArrowRight size={17} className="shrink-0 text-primary" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </RequireAuth>
  );
}
