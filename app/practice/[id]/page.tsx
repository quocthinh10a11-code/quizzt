"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  LogOut,
  Bookmark,
  BookmarkCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import NoteEditor from "@/components/NoteEditor";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePracticeSession, type PracticeQuestion } from "@/lib/usePracticeSession";
import { addToReviewQueue } from "@/lib/reviewQueue";
import AiTutorChat from "@/components/ai/AiTutorChat";
import { buildQuickActions } from "@/lib/ai/quickActions";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

const DIFFICULTY_VARIANT: Record<
  string,
  "success" | "warning" | "danger"
> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default function PracticePage() {
  const params = useParams();
  const quizId = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();

  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});

  const session = usePracticeSession({
    questions,
    userId: user?.id,
    quizId,
    quizTitle,
    attemptType: "quiz",
    storageKey: `quizResult:${quizId}`,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: quiz } = await supabase
        .from("quizzes")
        .select("title")
        .eq("id", quizId)
        .single();

      const { data: questionData } = await supabase
        .from("questions")
        .select("id, content, options, correct_index, difficulty")
        .eq("quiz_id", quizId);

      if (quiz) setQuizTitle(quiz.title);

      if (questionData) {
        setQuestions(questionData);

        if (user) {
          const ids = questionData.map((q) => q.id);

          const { data: bookmarkData } = await supabase
            .from("bookmarks")
            .select("question_id")
            .eq("user_id", user.id)
            .in("question_id", ids);

          setBookmarkedIds(
            new Set((bookmarkData ?? []).map((b) => b.question_id))
          );

          const { data: noteData } = await supabase
            .from("notes")
            .select("question_id, content")
            .eq("user_id", user.id)
            .in("question_id", ids);

          const notesMap: Record<number, string> = {};
          (noteData ?? []).forEach((n) => {
            notesMap[n.question_id] = n.content;
          });
          setNotes(notesMap);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [quizId, user?.id]);

  async function handleToggleBookmark(questionId: number) {
    if (!user) return;

    const isBookmarked = bookmarkedIds.has(questionId);

    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      isBookmarked ? next.delete(questionId) : next.add(questionId);
      return next;
    });

    const { error } = isBookmarked
      ? await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("question_id", questionId)
      : await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, question_id: questionId });

    if (error) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.add(questionId) : next.delete(questionId);
        return next;
      });
      return;
    }

    if (!isBookmarked) {
      addToReviewQueue(user.id, questionId, "bookmark");
    }
  }

  function handleExit() {
    const confirmed = window.confirm(
      "Kết quả của bạn sẽ không được tính. Xác nhận thoát?"
    );

    if (confirmed) {
      session.forceExit();
      router.push("/");
    }
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-68px)] bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-2/3 rounded-lg bg-surface-muted" />
            <div className="h-4 w-1/3 rounded bg-surface-muted" />
            <div className="h-96 rounded-2xl bg-surface-muted" />
          </div>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-[calc(100vh-68px)] bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-soft text-primary">
            <Sparkles size={26} />
          </div>
          <h1 className="mt-5 text-xl font-bold text-foreground">
            Chưa có câu hỏi
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Bộ đề này chưa có câu hỏi để bạn luyện tập.
          </p>
          <Button
            className="mt-6 w-full"
            variant="secondary"
            onClick={() => router.push("/")}
          >
            Quay lại
          </Button>
        </Card>
      </main>
    );
  }

  if (!session.started) {
    return (
      <main className="min-h-[calc(100vh-68px)] bg-background">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14 animate-fade-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-soft text-primary mb-4">
              <Sparkles size={23} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {quizTitle}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {questions.length} câu hỏi · Chọn cách học phù hợp với bạn
            </p>
          </div>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <input
                id="no-limit"
                type="checkbox"
                checked={session.noLimit}
                onChange={(e) => session.setNoLimit(e.target.checked)}
                className="mt-0.5 accent-primary w-4 h-4"
              />
              <label htmlFor="no-limit" className="cursor-pointer">
                <span className="block text-sm font-semibold text-foreground">
                  Không giới hạn thời gian
                </span>
                <span className="block mt-0.5 text-xs leading-5 text-muted">
                  Phù hợp khi bạn muốn tập trung vào việc hiểu bài hơn tốc độ.
                </span>
              </label>
            </div>

            <div
              className={cn(
                "mt-6 transition-opacity",
                session.noLimit && "opacity-40 pointer-events-none"
              )}
            >
              <Input
                type="number"
                min={1}
                label="Thời gian làm bài (phút)"
                value={session.minutesInput}
                onChange={(e) =>
                  session.setMinutesInput(
                    e.target.value.replace(/[^0-9]/g, "")
                  )
                }
                disabled={session.noLimit}
              />
            </div>
          </Card>

          <Button
            onClick={session.handleStart}
            variant="primary"
            className="mt-5 w-full"
            size="lg"
          >
            Bắt đầu làm bài
          </Button>

          <p className="mt-4 text-center text-xs text-muted">
            Bạn có thể đánh dấu câu hỏi và ghi chú trong lúc làm bài.
          </p>
        </div>
      </main>
    );
  }

  const question = questions[session.currentIndex];
  const answeredCount = session.answers.filter((a) => a !== null).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const correctCount = questions.filter(
    (q, i) => session.answers[i] === q.correct_index
  ).length;
  const score = Math.round((correctCount / questions.length) * 100);

  return (
    <main className="min-h-[calc(100vh-68px)] bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 animate-fade-up">
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                Đang làm bài
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {quizTitle}
              </h1>
              <p className="text-sm text-muted mt-0.5">
                Đã trả lời {answeredCount}/{questions.length} câu
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!session.submitted && (
                <button
                  onClick={handleExit}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                >
                  <LogOut size={15} />
                  Thoát
                </button>
              )}

              {!session.submitted && session.timeLeft !== null && (
                <Badge
                  variant={session.timeLeft <= 30 ? "danger" : "default"}
                  className="text-sm px-3 py-1.5"
                >
                  <Clock size={14} />
                  {session.formatTime(session.timeLeft)}
                </Badge>
              )}
            </div>
          </div>

          {!session.submitted && (
            <div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-muted">
                <span>Tiến độ</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}
        </div>

        {!session.submitted ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-5 items-start">
            <Card className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    Câu {session.currentIndex + 1} / {questions.length}
                  </p>
                  <div className="mt-2">
                    <Badge variant={DIFFICULTY_VARIANT[question.difficulty]}>
                      {DIFFICULTY_LABEL[question.difficulty]}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {user && (
                    <NoteEditor
                      userId={user.id}
                      questionId={question.id}
                      initialContent={notes[question.id] ?? ""}
                      onSaved={(content) =>
                        setNotes((prev) => ({
                          ...prev,
                          [question.id]: content,
                        }))
                      }
                    />
                  )}

                  <button
                    onClick={() => handleToggleBookmark(question.id)}
                    aria-label="Đánh dấu câu hỏi"
                    className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    {bookmarkedIds.has(question.id) ? (
                      <BookmarkCheck size={19} className="text-primary" />
                    ) : (
                      <Bookmark size={19} />
                    )}
                  </button>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-semibold leading-8 text-foreground mb-7">
                {question.content}
              </h2>

              <div className="flex flex-col gap-3">
                {question.options.map((option, index) => {
                  const isSelected =
                    session.answers[session.currentIndex] === index;

                  return (
                    <button
                      key={index}
                      onClick={() => session.handleSelect(index)}
                      className={cn(
                        "group w-full text-left px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl border transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-surface text-foreground border-border hover:border-primary/50 hover:bg-primary-soft/40"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-7 h-7 mr-3 rounded-lg text-xs font-bold border",
                          isSelected
                            ? "bg-white/15 border-white/30 text-white"
                            : "bg-surface-muted border-border text-muted group-hover:text-primary group-hover:border-primary/30"
                        )}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="align-middle text-sm sm:text-base">
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-border">
                <Button
                  onClick={session.handlePrevious}
                  disabled={session.currentIndex === 0}
                  variant="secondary"
                  leftIcon={<ChevronLeft size={16} />}
                >
                  Trước
                </Button>

                {session.currentIndex === questions.length - 1 ? (
                  <Button
                    onClick={session.handleSubmit}
                    variant="primary"
                    rightIcon={<Send size={16} />}
                  >
                    Nộp bài
                  </Button>
                ) : (
                  <Button
                    onClick={session.handleNext}
                    variant="primary"
                    rightIcon={<ChevronRight size={16} />}
                  >
                    Tiếp
                  </Button>
                )}
              </div>
            </Card>

            <Card className="p-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground">
                  Câu hỏi
                </p>
                <span className="text-[11px] text-muted">
                  {answeredCount}/{questions.length} đã làm
                </span>
              </div>

              <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const isCurrent = i === session.currentIndex;
                  const isAnswered = session.answers[i] !== null;
                  const isBookmarked = bookmarkedIds.has(q.id);

                  return (
                    <button
                      key={i}
                      onClick={() => session.setCurrentIndex(i)}
                      aria-label={`Đi đến câu ${i + 1}`}
                      className={cn(
                        "relative h-9 rounded-lg text-xs font-semibold border transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                        isCurrent
                          ? "bg-primary text-white border-primary shadow-sm"
                          : isAnswered
                          ? "bg-primary-soft text-primary border-primary/20"
                          : "bg-surface text-muted border-border hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      {i + 1}
                      {isBookmarked && !isCurrent && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-warning" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-border space-y-2 text-[11px] text-muted">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Đang xem
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-soft border border-primary/20" />
                  Đã trả lời
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                  Đã đánh dấu
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="max-w-xl mx-auto p-7 sm:p-10 text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-success-soft text-success">
              <CheckCircle2 size={34} />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-success">
              Hoàn thành
            </p>

            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-foreground">
              Kết quả của bạn
            </h2>

            <div className="mt-6 flex items-end justify-center gap-1">
              <span className="text-5xl font-bold tracking-tight text-primary">
                {score}
              </span>
              <span className="pb-1 text-xl font-semibold text-muted">%</span>
            </div>

            <p className="mt-2 text-sm text-muted">
              Bạn trả lời đúng {correctCount}/{questions.length} câu hỏi.
            </p>

            <div className="mt-6 h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${score}%` }}
              />
            </div>

            <Button
              onClick={() => router.push(`/review/${quizId}`)}
              variant="primary"
              size="lg"
              className="mt-7 w-full"
            >
              Xem lại đáp án
            </Button>
          </Card>
        )}

        {session.started && (
          <AiTutorChat
            questionContext={{
              content: question.content,
              options: question.options,
              correctIndex: question.correct_index,
            }}
            resetKey={question.id}
            submitted={session.submitted}
            screenContext="practice"
            quickActions={buildQuickActions({
              screenContext: "practice",
              submitted: session.submitted,
              wasCorrect: session.submitted
                ? session.answers[session.currentIndex] ===
                  question.correct_index
                : undefined,
            })}
          />
        )}
      </div>
    </main>
  );
}
