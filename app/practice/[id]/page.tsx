"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send, CheckCircle2, LogOut, Bookmark, BookmarkCheck } from "lucide-react";
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
const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
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
          setBookmarkedIds(new Set((bookmarkData ?? []).map((b) => b.question_id)));

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

  function handleExit() {
    const confirmed = window.confirm("Kết quả của bạn sẽ không được tính. Xác nhận thoát?");
    if (confirmed) {
      session.forceExit();
      router.push("/");
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải câu hỏi...</div>;
  }

  if (questions.length === 0) {
    return <div className="p-8 text-center text-gray-500">Bộ đề này chưa có câu hỏi nào.</div>;
  }

  if (!session.started) {
    return (
      <div className="p-8 max-w-md mx-auto text-center animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{quizTitle}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{questions.length} câu hỏi</p>

        <Card className="p-6 text-left">
          <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
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

  const question = questions[session.currentIndex];
  const answeredCount = session.answers.filter((a) => a !== null).length;

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-up">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{quizTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Đã trả lời {answeredCount}/{questions.length} câu
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!session.submitted && (
            <button
              onClick={handleExit}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-danger transition-colors px-2 py-1"
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
                Câu {session.currentIndex + 1} / {questions.length}
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
              <Button
                onClick={session.handlePrevious}
                disabled={session.currentIndex === 0}
                variant="secondary"
                leftIcon={<ChevronLeft size={16} />}
              >
                Trước
              </Button>

              {session.currentIndex === questions.length - 1 ? (
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
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
              Chuyển nhanh đến câu
            </p>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {questions.map((q, i) => {
                const isCurrent = i === session.currentIndex;
                const isAnswered = session.answers[i] !== null;
                const isBookmarked = bookmarkedIds.has(q.id);

                return (
                  <button
                    key={i}
                    onClick={() => session.setCurrentIndex(i)}
                    className={cn(
                      "relative h-9 w-9 rounded-md text-sm font-medium border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                      isCurrent
                        ? "bg-primary text-white border-primary"
                        : isBookmarked && isAnswered
                        ? "bg-primary/10 text-primary border-warning border-2"
                        : isBookmarked
                        ? "bg-warning/10 text-warning border-warning/40"
                        : isAnswered
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-primary/50"
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
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto text-success mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kết quả</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Đúng{" "}
            <span className="text-primary font-semibold">
              {questions.filter((q, i) => session.answers[i] === q.correct_index).length}
            </span>
            /{questions.length} câu
          </p>

          <Button onClick={() => router.push(`/review/${quizId}`)} variant="primary" size="lg">
            Xem lại đáp án
          </Button>
        </Card>
      )}
    </div>
  );
}