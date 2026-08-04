"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send, CheckCircle2, Bookmark, BookmarkCheck, LogOut, ArrowLeft, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import NoteEditor from "@/components/NoteEditor";
import { cn } from "@/lib/utils";

type BookmarkedQuestion = {
  id: number;
  content: string;
  options: string[];
  correct_index: number;
  difficulty: "easy" | "medium" | "hard";
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

  const [allQuestions, setAllQuestions] = useState<BookmarkedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  // Chọn nhóm (bộ đề) trước khi làm bài
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [started, setStarted] = useState(false);
  const [minutesInput, setMinutesInput] = useState("15");
  const [noLimit, setNoLimit] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function handleChooseGroup(key: string) {
    setSelectedGroupKey(key);
    setAnswers(Array((key === "all" ? allQuestions : groups.find((g) => g.key === key)?.questions ?? []).length).fill(null));
    setCurrentIndex(0);
    setSubmitted(false);
    setStarted(false);
  }

  function handleBackToSelection() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedGroupKey(null);
    setStarted(false);
    setSubmitted(false);
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
    }
  }

  function handleSelect(optionIndex: number) {
    const updated = [...answers];
    updated[currentIndex] = optionIndex;
    setAnswers(updated);
  }

  function handleNext() {
    if (currentIndex < activeQuestions.length - 1) setCurrentIndex(currentIndex + 1);
  }

  function handlePrevious() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  function handleSubmit() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    localStorage.setItem("quizResult:bookmarks", JSON.stringify({ questions: activeQuestions, answers }));
    setSubmitted(true);
  }

  function handleStart() {
    setStarted(true);
    if (!noLimit) {
      const minutes = Math.max(1, parseInt(minutesInput, 10) || 15);
      setTimeLeft(minutes * 60);
    }
  }

  function handleExit() {
    const confirmed = window.confirm("Kết quả của bạn sẽ không được tính. Xác nhận thoát?");
    if (confirmed) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      router.push("/");
    }
  }

  useEffect(() => {
    if (!started || noLimit || timeLeft === null) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [started, noLimit]);

  useEffect(() => {
    if (started && !submitted && timeLeft === 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  if (authLoading || loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải câu hỏi đã đánh dấu...</div>;
  }

  if (allQuestions.length === 0) {
    return (
      <div className="p-8 text-center animate-fade-up">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Bạn chưa đánh dấu câu hỏi nào. Vào phần Làm bài của 1 bộ đề, bấm biểu tượng bookmark trên mỗi câu để đánh dấu.
        </p>
        <Button onClick={() => router.push("/")} variant="primary">
          Về trang chủ
        </Button>
      </div>
    );
  }

  // Màn hình chọn bộ đề (chưa chọn nhóm nào)
  if (selectedGroupKey === null) {
    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Câu đã đánh dấu</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
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
              <p className="font-medium text-gray-900 dark:text-white">Tất cả câu đã đánh dấu</p>
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
              <p className="font-medium text-gray-900 dark:text-white truncate">{group.quizTitle}</p>
              <Badge variant="default">{group.questions.length} câu</Badge>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Màn hình đặt giờ (đã chọn nhóm, chưa bắt đầu)
  if (!started) {
    return (
      <div className="p-8 max-w-md mx-auto text-center animate-fade-up">
        <button
          onClick={handleBackToSelection}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={15} /> Chọn bộ đề khác
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{activeTitle}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{activeQuestions.length} câu hỏi</p>

        <Card className="p-6 text-left">
          <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={noLimit}
              onChange={(e) => setNoLimit(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            Không giới hạn thời gian
          </label>

          <div className={cn(noLimit && "opacity-40 pointer-events-none")}>
            <Input
              type="number"
              min={1}
              label="Thời gian làm bài (phút)"
              value={minutesInput}
              onChange={(e) => setMinutesInput(e.target.value.replace(/[^0-9]/g, ""))}
              disabled={noLimit}
            />
          </div>
        </Card>

        <Button onClick={handleStart} variant="primary" className="mt-6 w-full" size="lg">
          Bắt đầu làm bài
        </Button>
      </div>
    );
  }

  const question = activeQuestions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-up">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{activeTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Đã trả lời {answeredCount}/{activeQuestions.length} câu
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!submitted && (
            <button
              onClick={handleExit}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-danger transition-colors px-2 py-1"
            >
              <LogOut size={14} />
              Thoát
            </button>
          )}
          {!submitted && timeLeft !== null && (
            <Badge variant={timeLeft <= 30 ? "danger" : "default"} className="text-sm px-3 py-1.5">
              <Clock size={14} />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </div>
      </div>

      {!submitted ? (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-primary font-medium">
                Câu {currentIndex + 1} / {activeQuestions.length}
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
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  {bookmarkedIds.has(question.id) ? (
                    <BookmarkCheck size={18} className="text-primary" />
                  ) : (
                    <Bookmark size={18} />
                  )}
                </button>
              </div>
            </div>
            <p className="text-lg text-gray-900 dark:text-white mb-6">{question.content}</p>

            <div className="flex flex-col gap-3">
              {question.options.map((option, index) => {
                const isSelected = answers[currentIndex] === index;
                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    className={cn(
                      "text-left px-4 py-3 rounded-lg border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 hover:border-primary/50"
                    )}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-8">
              <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="secondary" leftIcon={<ChevronLeft size={16} />}>
                Trước
              </Button>
              {currentIndex === activeQuestions.length - 1 ? (
                <Button onClick={handleSubmit} variant="danger" rightIcon={<Send size={16} />}>
                  Nộp bài
                </Button>
              ) : (
                <Button onClick={handleNext} variant="primary" rightIcon={<ChevronRight size={16} />}>
                  Tiếp
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-4 mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Chuyển nhanh đến câu</p>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {activeQuestions.map((_, i) => {
                const isCurrent = i === currentIndex;
                const isAnswered = answers[i] !== null;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "h-9 w-9 rounded-md text-sm font-medium border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                      isCurrent
                        ? "bg-primary text-white border-primary"
                        : isAnswered
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-primary/50"
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kết quả</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Đúng{" "}
            <span className="text-primary font-semibold">
              {activeQuestions.filter((q, i) => answers[i] === q.correct_index).length}
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