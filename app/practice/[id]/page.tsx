"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
type Question = {
  id: number;
  content: string;
  options: string[];
  correct_index: number;
  difficulty: "easy" | "medium" | "hard";
};

export default function PracticePage() {
  const params = useParams();
  const quizId = Number(params.id);
  const router = useRouter();
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // ----- Đếm ngược -----
  const [started, setStarted] = useState(false);
  const [minutesInput, setMinutesInput] = useState("15");
  const [noLimit, setNoLimit] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // giây, null = không giới hạn
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setAnswers(Array(questionData.length).fill(null));
      }

      setLoading(false);
    }

    loadData();
  }, [quizId]);

  function handleSelect(optionIndex: number) {
    const updated = [...answers];
    updated[currentIndex] = optionIndex;
    setAnswers(updated);
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  }

  function handlePrevious() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  function handleSubmit() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    localStorage.setItem(
      `quizResult:${quizId}`,
      JSON.stringify({ questions, answers })
    );
    setSubmitted(true);
  }
  function handleExit() {
  const confirmed = window.confirm(
    "Kết quả của bạn sẽ không được tính. Xác nhận thoát?"
  );
  if (confirmed) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    router.push("/");
  }
}
  function handleStart() {
  setStarted(true);
  if (!noLimit) {
    const minutes = Math.max(1, parseInt(minutesInput, 10) || 15);
    setTimeLeft(minutes * 60);
  }
}

  // Chạy đồng hồ đếm ngược
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

  // Hết giờ -> tự động nộp bài
  useEffect(() => {
    if (started && !submitted && timeLeft === 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
  const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
  const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
    easy: "success",
    medium: "warning",
    hard: "danger",
  };
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải câu hỏi...</div>;
  }

  if (questions.length === 0) {
    return <div className="p-8 text-center text-gray-500">Bộ đề này chưa có câu hỏi nào.</div>;
  }

  // ----- Màn hình cài đặt thời gian trước khi bắt đầu -----
  if (!started) {
    return (
      <div className="p-8 max-w-md mx-auto text-center animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{quizTitle}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{questions.length} câu hỏi</p>

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

  const question = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;

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
                Câu {currentIndex + 1} / {questions.length}
              </p>
              <Badge variant={DIFFICULTY_VARIANT[question.difficulty]}>
                {DIFFICULTY_LABEL[question.difficulty]}
              </Badge>
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
              <Button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                variant="secondary"
                leftIcon={<ChevronLeft size={16} />}
              >
                Trước
              </Button>

              {currentIndex === questions.length - 1 ? (
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

          {/* Question Navigator */}
          <Card className="p-4 mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
              Chuyển nhanh đến câu
            </p>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {questions.map((_, i) => {
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
              {questions.filter((q, i) => answers[i] === q.correct_index).length}
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
