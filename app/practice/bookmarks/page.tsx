"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send, CheckCircle2, Bookmark, BookmarkCheck, LogOut, ArrowLeft, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import NoteEditor from "@/components/NoteEditor";
import { cn } from "@/lib/utils";
import { usePracticeSession, type PracticeQuestion } from "@/lib/usePracticeSession";
import { addToReviewQueue } from "@/lib/reviewQueue";
type BookmarkedQuestion = PracticeQuestion & {
  quiz_id: number | null;
  quiz_title: string;
};

type QuizGroup = {
  key: string;
  quizId: number | null;
  quizTitle: string;
  questions: BookmarkedQuestion[];
};

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default function BookmarksPracticePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { confirm } = useConfirm();

  const [allQuestions, setAllQuestions] = useState<BookmarkedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    async function loadBookmarked() {
      setLoading(true);
      const { data } = await supabase
        .from("bookmarks")
        .select("question_id, questions(id, content, options, correct_index, difficulty, quiz_id, quizzes(title))")
        .eq("user_id", user!.id);

      const list: BookmarkedQuestion[] = (data ?? [])
        .map((row: any) => {
          const q = row.questions;
          if (!q) return null;
          return {
            id: q.id,
            content: q.content,
            options: q.options,
            correct_index: q.correct_index,
            difficulty: q.difficulty,
            quiz_id: q.quiz_id,
            quiz_title: q.quizzes?.title ?? "Bộ đề không xác định",
          };
        })
        .filter(Boolean) as BookmarkedQuestion[];

      setAllQuestions(list);
      setBookmarkedIds(new Set(list.map((q) => q.id)));

      const { data: noteData } = await supabase
        .from("notes")
        .select("question_id, content")
        .eq("user_id", user!.id)
        .in("question_id", list.map((q) => q.id));
      const notesMap: Record<number, string> = {};
      (noteData ?? []).forEach((n) => {
        notesMap[n.question_id] = n.content;
      });
      setNotes(notesMap);

      setLoading(false);
    }

    loadBookmarked();
  }, [authLoading, user]);

  const groups = useMemo<QuizGroup[]>(() => {
    const map = new Map<string, QuizGroup>();
    for (const q of allQuestions) {
      const key = q.quiz_id !== null ? `quiz:${q.quiz_id}` : `unknown:${q.quiz_title}`;
      if (!map.has(key)) {
        map.set(key, { key, quizId: q.quiz_id, quizTitle: q.quiz_title, questions: [] });
      }
      map.get(key)!.questions.push(q);
    }
    return Array.from(map.values()).sort((a, b) => a.quizTitle.localeCompare(b.quizTitle));
  }, [allQuestions]);

  const activeQuestions = useMemo<BookmarkedQuestion[]>(() => {
    if (selectedGroupKey === null) return [];
    if (selectedGroupKey === "all") return allQuestions;
    return groups.find((g) => g.key === selectedGroupKey)?.questions ?? [];
  }, [selectedGroupKey, allQuestions, groups]);

  const activeTitle =
    selectedGroupKey === "all"
      ? "Tất cả câu đã đánh dấu"
      : groups.find((g) => g.key === selectedGroupKey)?.quizTitle ?? "Câu đã đánh dấu";

  // Nếu chọn 1 bộ đề cụ thể thì gắn quiz_id đó, nếu chọn "Tất cả" (nhiều bộ đề trộn lẫn) thì để null
  const activeQuizId =
    selectedGroupKey && selectedGroupKey !== "all"
      ? groups.find((g) => g.key === selectedGroupKey)?.quizId ?? null
      : null;

  const session = usePracticeSession({
    questions: activeQuestions,
    userId: user?.id,
    quizId: activeQuizId,
    quizTitle: activeTitle,
    attemptType: "bookmark",
    storageKey: "quizResult:bookmarks",
  });

  function handleChooseGroup(key: string) {
    setSelectedGroupKey(key);
    session.resetSession();
  }

  function handleBackToSelection() {
    session.stopTimer();
    setSelectedGroupKey(null);
  }

  async function handleToggleBookmark(questionId: number) {
    if (!user) return;
    const isBookmarked = bookmarkedIds.has(questionId);

    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      isBookmarked ? next.delete(questionId) : next.add(questionId);
      return next;
    });

    const { error } = isBookmarked
      ? await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("question_id", questionId)
      : await supabase.from("bookmarks").insert({ user_id: user.id, question_id: questionId });

    if (error) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        isBookmarked ? next.add(questionId) : next.delete(questionId);
        return next;
      });
      return;
    }

    // Bookmark mới (không phải gỡ) -> tự động đưa vào Review Queue
    if (!isBookmarked) {
      addToReviewQueue(user.id, questionId, "bookmark");
    }
  }

  async function handleExit() {
    const confirmed = await confirm({
      title: "Rời khỏi bài làm?",
      description: "Kết quả của bạn sẽ không được tính. Bạn có chắc muốn rời khỏi bài làm?",
      confirmLabel: "Rời bài",
    });
    if (confirmed) {
      session.forceExit();
      router.push("/");
    }
  }

  if (authLoading || loading) {
    return <div className="p-8 text-center text-foreground/80">Đang tải câu hỏi đã đánh dấu...</div>;
  }

  if (allQuestions.length === 0) {
    return (
      <div className="p-8 text-center animate-fade-up">
        <p className="text-muted mb-4">
          Bạn chưa đánh dấu câu hỏi nào. Vào phần Làm bài của 1 bộ đề, bấm biểu tượng bookmark trên mỗi câu để đánh dấu.
        </p>
        <Button onClick={() => router.push("/")} variant="primary">
          Về trang chủ
        </Button>
      </div>
    );
  }

  if (selectedGroupKey === null) {
    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground mb-1">Câu đã đánh dấu</h1>
        <p className="text-muted mb-6">
          Chọn bộ đề để ôn lại các câu đã đánh dấu trong bộ đề đó
        </p>

        <div className="flex flex-col gap-3">
          <Card
            hoverable
            className="p-4 flex items-center justify-between gap-4 cursor-pointer"
            onClick={() => handleChooseGroup("all")}
          >
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-primary" />
              <p className="font-medium text-foreground">Tất cả câu đã đánh dấu</p>
            </div>
            <Badge variant="primary">{allQuestions.length} câu</Badge>
          </Card>

          {groups.map((group) => (
            <Card
              key={group.key}
              hoverable
              className="p-4 flex items-center justify-between gap-4 cursor-pointer"
              onClick={() => handleChooseGroup(group.key)}
            >
              <p className="font-medium text-foreground truncate">{group.quizTitle}</p>
              <Badge variant="default">{group.questions.length} câu</Badge>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!session.started) {
    return (
      <div className="p-8 max-w-md mx-auto text-center animate-fade-up">
        <button
          onClick={handleBackToSelection}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={15} /> Chọn bộ đề khác
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">{activeTitle}</h1>
        <p className="text-muted mb-6">{activeQuestions.length} câu hỏi</p>

        <Card className="p-6 text-left">
          <label className="flex items-center gap-2 mb-4 text-sm text-foreground/80 cursor-pointer">
            <input
              type="checkbox"
              checked={session.noLimit}
              onChange={(e) => session.setNoLimit(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            Không giới hạn thời gian
          </label>

          <div className={cn(session.noLimit && "opacity-40 pointer-events-none")}>
            <Input
              type="number"
              min={1}
              label="Thời gian làm bài (phút)"
              value={session.minutesInput}
              onChange={(e) => session.setMinutesInput(e.target.value.replace(/[^0-9]/g, ""))}
              disabled={session.noLimit}
            />
          </div>
        </Card>

        <Button onClick={session.handleStart} variant="primary" className="mt-6 w-full" size="lg">
          Bắt đầu làm bài
        </Button>
      </div>
    );
  }

  const question = activeQuestions[session.currentIndex];
  const answeredCount = session.answers.filter((a) => a !== null).length;

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-up">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{activeTitle}</h1>
          <p className="text-sm text-muted mt-0.5">
            Đã trả lời {answeredCount}/{activeQuestions.length} câu
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!session.submitted && (
            <button
              onClick={handleExit}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors px-2 py-1"
            >
              <LogOut size={14} />
              Thoát
            </button>
          )}
          {!session.submitted && session.timeLeft !== null && (
            <Badge variant={session.timeLeft <= 30 ? "danger" : "default"} className="text-sm px-3 py-1.5">
              <Clock size={14} />
              {session.formatTime(session.timeLeft)}
            </Badge>
          )}
        </div>
      </div>

      {!session.submitted ? (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-primary font-medium">
                Câu {session.currentIndex + 1} / {activeQuestions.length}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant={DIFFICULTY_VARIANT[question.difficulty]}>
                  {DIFFICULTY_LABEL[question.difficulty]}
                </Badge>
                {user && (
                  <NoteEditor
                    userId={user.id}
                    questionId={question.id}
                    initialContent={notes[question.id] ?? ""}
                    onSaved={(content) =>
                      setNotes((prev) => ({ ...prev, [question.id]: content }))
                    }
                  />
                )}
                <button
                  onClick={() => handleToggleBookmark(question.id)}
                  aria-label="Đánh dấu câu hỏi"
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  {bookmarkedIds.has(question.id) ? (
                    <BookmarkCheck size={18} className="text-primary" />
                  ) : (
                    <Bookmark size={18} />
                  )}
                </button>
              </div>
            </div>
            <p className="text-lg text-foreground mb-6">{question.content}</p>

            <div className="flex flex-col gap-3">
              {question.options.map((option, index) => {
                const isSelected = session.answers[session.currentIndex] === index;
                return (
                  <button
                    key={index}
                    onClick={() => session.handleSelect(index)}
                    className={cn(
                      "text-left px-4 py-3 rounded-lg border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-foreground border-border hover:border-primary/50"
                    )}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-8">
              <Button onClick={session.handlePrevious} disabled={session.currentIndex === 0} variant="secondary" leftIcon={<ChevronLeft size={16} />}>
                Trước
              </Button>
              {session.currentIndex === activeQuestions.length - 1 ? (
                <Button onClick={session.handleSubmit} variant="danger" rightIcon={<Send size={16} />}>
                  Nộp bài
                </Button>
              ) : (
                <Button onClick={session.handleNext} variant="primary" rightIcon={<ChevronRight size={16} />}>
                  Tiếp
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-4 mt-4">
            <p className="text-xs font-medium text-muted mb-3">Chuyển nhanh đến câu</p>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {activeQuestions.map((_, i) => {
                const isCurrent = i === session.currentIndex;
                const isAnswered = session.answers[i] !== null;
                return (
                  <button
                    key={i}
                    onClick={() => session.setCurrentIndex(i)}
                    className={cn(
                      "h-9 w-9 rounded-md text-sm font-medium border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                      isCurrent
                        ? "bg-primary text-white border-primary"
                        : isAnswered
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-transparent text-muted border-border hover:border-primary/50"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto text-success mb-3" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Kết quả</h2>
          <p className="text-lg text-foreground/80 dark:text-muted mb-6">
            Đúng{" "}
            <span className="text-primary font-semibold">
              {activeQuestions.filter((q, i) => session.answers[i] === q.correct_index).length}
            </span>
            /{activeQuestions.length} câu
          </p>
          <Button onClick={() => router.push("/review/bookmarks")} variant="primary" size="lg">
            Xem lại đáp án
          </Button>
        </Card>
      )}
    </div>
  );
}