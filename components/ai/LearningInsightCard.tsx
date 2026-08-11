"use client";

import { useState } from "react";
import { Brain, Loader2, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import type { LearningInsight } from "@/lib/ai/learningInsight";

type Props = {
  attemptId: number;
};

export default function LearningInsightCard({ attemptId }: Props) {
  const [insight, setInsight] = useState<LearningInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadInsight() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setError("Bạn cần đăng nhập để sử dụng tính năng này.");
        return;
      }

      const response = await fetch("/api/ai/insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ attemptId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Không thể tạo phân tích lúc này.");
        return;
      }

      if (!data.insight) {
        setError("Phiên học này chưa có đủ dữ liệu để phân tích.");
        return;
      }

      setInsight(data.insight as LearningInsight);
    } catch {
      setError("Không thể kết nối tới máy chủ AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 mt-4 text-left">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          <Brain size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">AI Learning Insight</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Hiểu nhanh điều bạn vừa làm tốt, điểm cần chú ý và bước tiếp theo.
          </p>
        </div>
      </div>

      {!insight && !loading && !error && (
        <Button onClick={loadInsight} variant="secondary" className="mt-4 w-full" size="md">
          Phân tích phiên học
        </Button>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" role="status">
          <Loader2 size={16} className="animate-spin" />
          AI đang phân tích phiên học...
        </div>
      )}

      {error && (
        <div className="mt-4">
          <p className="text-sm text-danger">{error}</p>
          <Button onClick={loadInsight} variant="secondary" className="mt-3 w-full" size="md" leftIcon={<RefreshCw size={15} />}>
            Thử lại
          </Button>
        </div>
      )}

      {insight && (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{insight.summary}</p>

          {insight.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Điểm mạnh</p>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
                {insight.strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
              </ul>
            </div>
          )}

          {insight.focusAreas.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Điểm đáng chú ý</p>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
                {insight.focusAreas.map((item, index) => <li key={`focus-${index}`}>{item}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-primary/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-primary mb-1">Gợi ý tiếp theo</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{insight.nextAction}</p>
          </div>

          <Button onClick={loadInsight} variant="secondary" className="w-full" size="md" disabled={loading} leftIcon={<RefreshCw size={15} />}>
            Phân tích lại
          </Button>
        </div>
      )}
    </Card>
  );
}
