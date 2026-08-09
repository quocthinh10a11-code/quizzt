"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  X,
  ListPlus,
  CheckCircle,
  MessageCircle,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  CircleAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import NoteEditor from "@/components/NoteEditor";
import { cn } from "@/lib/utils";
import { addToReviewQueue, getQuestionIdsInQueue } from "@/lib/reviewQueue";
import AiTutorChat from "@/components/ai/AiTutorChat";
import { buildQuickActions } from "@/lib/ai/quickActions";

type StoredQuestion = {
  id: number;
  content: string;
  options: string[];
  correct_index: number;
};

type StoredResult = {
  questions: StoredQuestion[];
  answers: (number | null)[];
};

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const { user } = useAuth();

  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [reviewQueueIds, setReviewQueueIds] = useState<Set<number>>(new Set());
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`quizResult:${quizId}`);
    if (raw) {
      const parsed: StoredResult = JSON.parse(raw);
      setResult(parsed);

      if (user) {
        const questionIds = parsed.questions.map((q) => q.id);

        supabase
          .from("notes")
          .select("question_id, content")
          .eq("user_id", user.id)
          .in("question_id", questionIds)
          .then(({ data }) => {
            const notesMap: Record<number, string> = {};
            (data ?? []).forEach((n) => {
              notesMap[n.question_id] = n.content;
            });
            setNotes(notesMap);
          });

        getQuestionIdsInQueue(user.id, questionIds).then(setReviewQueueIds);
      }
    }
    setLoaded(true);
  }, [quizId, user?.id]);

  async function handleAddToReview(
    questionId: number,
    source: "wrong_answer" | "note"
  ) {
    if (!user || reviewQueueIds.has(questionId)) return;

    setReviewQueueIds((prev) => new Set(prev).add(questionId));
    const { error } = await addToReviewQueue(user.id, questionId, source);

    if (error) {
      setReviewQueueIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  }

  if (!loaded) return null;

  if (!result) {
    return (
      <main className="min-h-[calc(100vh-68px)] bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center animate-fade-up">
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-soft text-primary">
            <CircleAlert size={26} />
          </div>
          <h1 className="mt-5 text-xl font-bold text-foreground">
            Chưa có kết quả
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Bạn chưa làm bộ đề này. Hãy hoàn thành một lượt làm bài trước khi xem lại.
          </p>
          <Button
            onClick={() => router.push(`/practice/${quizId}`)}
            variant="primary"
            className="mt-6 w-full"
          >
            Làm bài ngay
          </Button>
        </Card>
      </main>
    );
  }

  const correctCount = result.questions.filter(
    (q, i) => result.answers[i] === q.correct_index
  ).length;
  const answeredCount = result.answers.filter((answer) => answer !== null).length;
  const total = result.questions.length;
  const wrongCount = answeredCount - correctCount;
  const unansweredCount = total - answeredCount;
  const score = Math.round((correctCount / total) * 100);

  const summary =
    score >= 80
      ? "Rất tốt! Bạn đã nắm khá chắc phần kiến thức này."
      : score >= 60
      ? "Khá ổn! Hãy xem lại các câu sai để củng cố kiến thức."
      : "Đừng lo — xem kỹ các câu sai sẽ giúp bạn tiến bộ nhanh hơn.";

  return (
    <main className="min-h-[calc(100vh-68px)] bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-10 animate-fade-up">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-lg px-2 py-1.5"
          >
            <ArrowLeft size={16} />
            Thư viện bộ đề
          </button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw size={15} />}
            onClick={() => router.push(`/practice/${quizId}`)}
          >
            Làm lại
          </Button>
        </div>

        <section className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-5 mb-8">
          <Card className="p-6 sm:p-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-soft text-primary shrink-0">
                <Sparkles size={21} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Hoàn thành
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Xem lại đáp án
                </h1>
              </div>
            </div>

            <p className="mt-5 text-sm sm:text-base leading-6 text-muted max-w-2xl">
              {summary}
            </p>

            <div className="mt-7 flex items-end gap-1">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight text-primary">
                {score}
              </span>
              <span className="text-xl font-semibold text-muted pb-2">%</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {correctCount}/{total} câu đúng
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="text-sm font-semibold text-foreground mb-4">Tóm tắt</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  Đúng
                </span>
                <span className="font-semibold text-success">{correctCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger" />
                  Sai
                </span>
                <span className="font-semibold text-danger">{wrongCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-surface-muted border border-border" />
                  Chưa trả lời
                </span>
                <span className="font-semibold text-foreground">{unansweredCount}</span>
              </div>
            </div>

            <div className="mt-5 h-2 rounded-full bg-surface-muted overflow-hidden flex">
              <div
                className="h-full bg-success"
                style={{ width: `${(correctCount / total) * 100}%` }}
              />
              <div
                className="h-full bg-danger"
                style={{ width: `${(wrongCount / total) * 100}%` }}
              />
            </div>
          </Card>
        </section>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Chi tiết từng câu</h2>
            <p className="text-sm text-muted mt-1">
              Xem đáp án đúng, câu bạn chọn và thêm câu cần ôn tập.
            </p>
          </div>
          <Badge variant="default">{total} câu</Badge>
        </div>

        <div className="flex flex-col gap-4">
          {result.questions.map((question, i) => {
            const selected = result.answers[i];
            const isCorrect = selected === question.correct_index;

            return (
              <Card
                key={question.id}
                className={cn(
                  "p-5 sm:p-6 border-l-4",
                  isCorrect ? "border-l-success" : "border-l-danger"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        isCorrect
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger"
                      )}
                    >
                      {isCorrect ? <Check size={17} /> : <X size={17} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-muted">
                          Câu {i + 1}
                        </span>
                        <Badge variant={isCorrect ? "success" : "danger"}>
                          {isCorrect ? "Đúng" : "Sai"}
                        </Badge>
                      </div>
                      <p className="font-semibold leading-6 text-foreground">
                        {question.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {user && !isCorrect && (
                      reviewQueueIds.has(question.id) ? (
                        <span title="Đã có trong danh sách ôn tập" className="p-2 text-success">
                          <CheckCircle size={18} />
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToReview(question.id, "wrong_answer")}
                          title="Thêm vào ôn tập"
                          className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                        >
                          <ListPlus size={18} />
                        </button>
                      )
                    )}
                    {user && (
                      <NoteEditor
                        userId={user.id}
                        questionId={question.id}
                        initialContent={notes[question.id] ?? ""}
                        onSaved={(content) => {
                          setNotes((prev) => ({ ...prev, [question.id]: content }));
                          if (content.trim()) {
                            handleAddToReview(question.id, "note");
                          }
                        }}
                      />
                    )}
                    <button
                      onClick={() => setActiveQuestionId(question.id)}
                      title="Hỏi AI về câu này"
                      className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  {question.options.map((option, optIndex) => {
                    const isSelected = optIndex === selected;
                    const isTheCorrectOne = optIndex === question.correct_index;

                    return (
                      <div
                        key={optIndex}
                        className={cn(
                          "flex items-start gap-3 px-3.5 py-3 rounded-xl border text-sm leading-5",
                          isTheCorrectOne &&
                            "border-success/30 bg-success-soft text-foreground",
                          isSelected &&
                            !isCorrect &&
                            "border-danger/30 bg-danger-soft text-foreground",
                          !isTheCorrectOne &&
                            !(isSelected && !isCorrect) &&
                            "border-border bg-surface text-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold border",
                            isTheCorrectOne
                              ? "border-success/30 text-success bg-surface"
                              : isSelected && !isCorrect
                              ? "border-danger/30 text-danger bg-surface"
                              : "border-border text-muted bg-surface-muted"
                          )}
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {isTheCorrectOne && (
                          <span className="text-xs font-semibold text-success shrink-0">
                            Đáp án đúng
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-xs font-semibold text-danger shrink-0">
                            Bạn chọn
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {selected === null && (
                    <p className="text-sm text-muted mt-1 pl-1">
                      Bạn chưa chọn đáp án cho câu này.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-8">
          <Button
            onClick={() => router.push("/")}
            variant="secondary"
            leftIcon={<ArrowLeft size={16} />}
          >
            Về thư viện
          </Button>
          <Button
            onClick={() => router.push(`/practice/${quizId}`)}
            variant="primary"
            leftIcon={<RotateCcw size={16} />}
          >
            Làm lại bộ đề
          </Button>
        </div>

        {activeQuestionId !== null && (() => {
          const activeQuestion = result.questions.find(
            (q) => q.id === activeQuestionId
          );
          if (!activeQuestion) return null;
          const activeIndex = result.questions.findIndex(
            (q) => q.id === activeQuestionId
          );
          const wasCorrect =
            result.answers[activeIndex] === activeQuestion.correct_index;

          return (
            <AiTutorChat
              key={activeQuestionId}
              questionContext={{
                content: activeQuestion.content,
                options: activeQuestion.options,
                correctIndex: activeQuestion.correct_index,
              }}
              resetKey={activeQuestion.id}
              submitted={true}
              screenContext="review"
              autoOpen={true}
              quickActions={buildQuickActions({
                screenContext: "review",
                submitted: true,
                wasCorrect,
              })}
            />
          );
        })()}
      </div>
    </main>
  );
}
