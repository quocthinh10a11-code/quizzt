"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, ChevronLeft, ChevronRight, Send, CheckCircle2,
  LogOut, ArrowLeft, Layers, Brain,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { usePracticeSession, type PracticeQuestion } from "@/lib/usePracticeSession";
import {
  getDueReviewQuestions,
  updateReviewProgress,
  removeFromReviewQueue,
  type DueReviewQuestion,
} from "@/lib/reviewQueue";

type QuizGroup = {
  key: string;
  quizId: number | null;
  quizTitle: string;
  questions: DueReviewQuestion[];
};

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default function SmartReviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [allDue, setAllDue] = useState<DueReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    async function load() {
      setLoading(true);
      const data = await getDueReviewQuestions(user!.id);
      setAllDue(data);
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  const groups = useMemo<QuizGroup[]>(() => {
    const map = new Map<string, QuizGroup>();
    for (const q of allDue) {
      const key = q.quizId !== null ? `quiz:${q.quizId}` : `unknown:${q.quizTitle}`;
      if (!map.has(key)) {
        map.set(key, { key, quizId: q.quizId, quizTitle: q.quizTitle, questions: [] });
      }
      map.get(key)!.questions.push(q);
    }
    return Array.from(map.values()).sort((a, b) => a.quizTitle.localeCompare(b.quizTitle));
  }, [allDue]);

  const activeQuestions = useMemo<DueReviewQuestion[]>(() => {
    if (selectedGroupKey === null) return [];
    if (selectedGroupKey === "all") return allDue;
    return groups.find((g) => g.key === selectedGroupKey)?.questions ?? [];
  }, [selectedGroupKey, allDue, groups]);

  const activeTitle =
    selectedGroupKey === "all"
      ? "Ôn tập hôm nay - Tất cả"
      : groups.find((g) => g.key === selectedGroupKey)?.quizTitle ?? "Ôn tập hôm nay";

  const activeQuizId =
    selectedGroupKey && selectedGroupKey !== "all"
      ? groups.find((g) => g.key === selectedGroupKey)?.quizId ?? null
      : null;

  const sessionQuestions: PracticeQuestion[] = activeQuestions.map((q) => ({
    id: q.questionId,
    content: q.content,
    options: q.options,
    correct_index: q.correctIndex,
    difficulty: q.difficulty,
  }));

  const session = usePracticeSession({
    questions: sessionQuestions,
    userId: user?.id,
    quizId: activeQuizId,
    quizTitle: activeTitle,
    attemptType: "review_queue",
    storageKey: "quizResult:smart-review",
  });

  function handleChooseGroup(key: string) {
    setSelectedGroupKey(key);
    session.resetSession();
  }

  function handleBackToSelection() {
    session.stopTimer();
    setSelectedGroupKey(null);
  }

  function handleExit() {
    const confirmed = window.confirm("Kết quả của bạn sẽ không được tính. Xác nhận thoát?");
    if (confirmed) {
      session.forceExit();
      router.push("/");
    }
  }

  // Nộp bài xong -> cập nhật chu kỳ ôn tập cho từng câu theo đúng/sai
  async function handleSubmitAndUpdateProgress() {
    await session.handleSubmit();
    await Promise.all(
      activeQuestions.map((q, i) => updateReviewProgress(q.reviewId, session.answers[i] === q.correctIndex))
    );
  }

  async function handleRemove(questionId: number) {
    if (!user) return;
    const prevList = allDue;
    setAllDue((prev) => prev.filter((q) => q.questionId !== questionId));
    const { error } = await removeFromReviewQueue(user.id, questionId);
    if (error) setAllDue(prevList);
  }

  if (authLoading || loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải câu cần ôn hôm nay...</div>;
  }

  if (allDue.length === 0) {
    return (
      <div className="p-8 text-center animate-fade-up">
        <Brain size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Không có câu nào cần ôn hôm nay. Hãy bookmark hoặc đánh dấu thêm câu ở phần Ôn tập/Xem lại đáp án.
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Ôn tập hôm nay</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Chọn bộ đề để ôn các câu đã đến hạn</p>

        <div className="flex flex-col gap-3">
          <Card
            hoverable
            className="p-4 flex items-center justify-between gap-4 cursor-pointer"
            onClick={() => handleChooseGroup("all")}
          >
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-primary" />
              <p className="font-medium text-gray-900 dark:text-white">Tất cả câu cần ôn</p>
            </div>
            <Badge variant="primary">{allDue.length} câu</Badge>
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

        <div className="mt-8">
          <button
            onClick={() => setShowManage((v) => !v)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors underline"
          >
            {showManage ? "Ẩn danh sách chi tiết" : "Quản lý danh sách ôn tập"}
          </button>

          {showManage && (
            <div className="mt-3 flex flex-col gap-2 animate-fade-up">
              {allDue.map((q) => (
                <div
                  key={q.questionId}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white truncate">{q.content}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {q.quizTitle} · chu kỳ {q.intervalDays} ngày
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(q.questionId)}
                    className="shrink-0 text-xs text-gray-400 hover:text-danger px-2 py-1"
                  >
                    Gỡ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session.started) {
    return (
      <div className="p-8 max-w-md mx-auto text-center animate-fade-up">
        <button
          onClick={handleBackToSelection}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={15} /> Chọn nhóm khác
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{activeTitle}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{activeQuestions.length} câu hỏi</p>

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
          Bắt đầu ôn tập
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{activeTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Đã trả lời {answeredCount}/{activeQuestions.length} câu
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
                Câu {session.currentIndex + 1} / {activeQuestions.length}
              </p>
              <Badge variant={DIFFICULTY_VARIANT[question.difficulty]}>
                {DIFFICULTY_LABEL[question.difficulty]}
              </Badge>
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
              {session.currentIndex === activeQuestions.length - 1 ? (
                <Button onClick={handleSubmitAndUpdateProgress} variant="danger" rightIcon={<Send size={16} />}>
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
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Chuyển nhanh đến câu</p>
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Đã cập nhật chu kỳ ôn tập</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Đúng{" "}
            <span className="text-primary font-semibold">
              {activeQuestions.filter((q, i) => session.answers[i] === q.correctIndex).length}
            </span>
            /{activeQuestions.length} câu
          </p>
          <Button onClick={() => router.push("/smart-review")} variant="primary" size="lg">
            Về danh sách ôn tập
          </Button>
        </Card>
      )}
    </div>
  );
}