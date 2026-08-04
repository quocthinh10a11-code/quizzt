"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import {
  getAttemptDetail,
  type AttemptSummary,
  type AttemptDetailAnswer,
} from "@/lib/quizAttempts";

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default function AttemptDetailPage() {
  const params = useParams();
  const attemptId = Number(params.id);
  const router = useRouter();

  const [summary, setSummary] = useState<AttemptSummary | null>(null);
  const [answers, setAnswers] = useState<AttemptDetailAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getAttemptDetail(attemptId);
      setSummary(result.summary);
      setAnswers(result.answers);
      setLoading(false);
    }
    load();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto flex flex-col gap-3">
        <Skeleton className="h-24 rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-center text-gray-500">
        Không tìm thấy lượt làm bài này.
      </div>
    );
  }

  const percent = Math.round((summary.correct_count / summary.total_questions) * 100);

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto animate-fade-up">
        <button
          onClick={() => router.push("/history")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={15} /> Quay lại lịch sử
        </button>

        <Card className="p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {summary.quiz_title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {new Date(summary.created_at).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-2xl font-bold text-primary">
            {summary.correct_count}/{summary.total_questions}{" "}
            <span className="text-base font-normal text-gray-500 dark:text-gray-400">
              ({percent}%)
            </span>
          </p>
        </Card>

        <div className="flex flex-col gap-3">
          {answers.map((a, i) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm text-gray-400">Câu {i + 1}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={DIFFICULTY_VARIANT[a.difficulty]}>
                    {DIFFICULTY_LABEL[a.difficulty] ?? a.difficulty}
                  </Badge>
                  {a.is_correct ? (
                    <CheckCircle2 size={18} className="text-success" />
                  ) : (
                    <XCircle size={18} className="text-danger" />
                  )}
                </div>
              </div>
              <p
                className={cn(
                  "text-gray-900 dark:text-white",
                  !a.is_correct && "font-medium"
                )}
              >
                {a.question_content}
              </p>
              {!a.is_correct && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {a.selected_index === null
                    ? "Bạn chưa chọn đáp án nào."
                    : `Bạn chọn: đáp án ${String.fromCharCode(65 + a.selected_index)}`}
                  {" · "}
                  Đáp án đúng: {String.fromCharCode(65 + a.correct_index)}
                </p>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="secondary" onClick={() => router.push("/history")}>
            Quay lại lịch sử
          </Button>
        </div>
      </div>
    </RequireAuth>
  );
}