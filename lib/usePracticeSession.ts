"use client";

import { useEffect, useRef, useState } from "react";
import { saveQuizAttempt, type AttemptType } from "@/lib/quizAttempts";
import { useToast } from "@/components/ui/Toast";

export type PracticeQuestion = {
  id: number;
  content: string;
  options: string[];
  correct_index: number;
  difficulty: "easy" | "medium" | "hard";
};

type Params = {
  questions: PracticeQuestion[];
  userId: string | undefined;
  quizId: number | null;
  quizTitle: string;
  attemptType: AttemptType;
  storageKey: string;
};

const EXIT_WARNING_MESSAGE = "Kết quả của bạn sẽ không được tính. Xác nhận rời khỏi bài làm?";

export function usePracticeSession({ questions, userId, quizId, quizTitle, attemptType, storageKey }: Params) {
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  const [started, setStarted] = useState(false);
  const [minutesInput, setMinutesInput] = useState("15");
  const [noLimit, setNoLimit] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Reset câu trả lời mỗi khi danh sách câu hỏi thay đổi (ví dụ đổi bộ đề đang chọn)
  useEffect(() => {
    setAnswers(Array(questions.length).fill(null));
    setAttemptId(null);
  }, [questions]);

  function resetSession() {
    setAnswers(Array(questions.length).fill(null));
    setCurrentIndex(0);
    setSubmitted(false);
    setAttemptId(null);
    setStarted(false);
    setTimeLeft(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

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

  function handleStart() {
    setStarted(true);
    startTimeRef.current = Date.now();
    if (!noLimit) {
      const minutes = Math.max(1, parseInt(minutesInput, 10) || 15);
      setTimeLeft(minutes * 60);
    }
  }

  async function handleSubmit() {
    stopTimer();
    localStorage.setItem(storageKey, JSON.stringify({ questions, answers }));
    setSubmitted(true);

    if (!userId) return;

    const timeTakenSeconds = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : null;

    const attemptAnswers = questions.map((q, i) => ({
      question_id: q.id,
      question_content: q.content,
      difficulty: q.difficulty,
      selected_index: answers[i],
      correct_index: q.correct_index,
      is_correct: answers[i] === q.correct_index,
    }));

    const { attemptId: savedAttemptId, error } = await saveQuizAttempt({
      userId,
      quizId,
      quizTitle,
      timeTakenSeconds,
      answers: attemptAnswers,
      attemptType,
    });

    if (savedAttemptId !== null) {
      setAttemptId(savedAttemptId);
    }

    if (error) {
      showToast("Không thể lưu lịch sử làm bài: " + error, "error");
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

  // Chặn mọi hình thức rời khỏi bài làm khi đang trong lúc thi (chưa nộp bài)
  useEffect(() => {
    const isActive = started && !submitted;
    if (!isActive) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    function handleDocumentClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;

      const confirmed = window.confirm(EXIT_WARNING_MESSAGE);
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Chặn nút Back/Forward của trình duyệt: chèn thêm 1 mốc lịch sử,
    // để lần bấm Back đầu tiên chỉ trigger cảnh báo thay vì rời trang ngay
    window.history.pushState(null, "", window.location.href);

    function handlePopState() {
      const confirmed = window.confirm(EXIT_WARNING_MESSAGE);
      if (confirmed) {
        window.history.back();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [started, submitted]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function forceExit() {
    stopTimer();
    setStarted(false);
  }

  return {
    currentIndex,
    setCurrentIndex,
    answers,
    submitted,
    attemptId,
    started,
    minutesInput,
    setMinutesInput,
    noLimit,
    setNoLimit,
    timeLeft,
    handleSelect,
    handleNext,
    handlePrevious,
    handleStart,
    handleSubmit,
    stopTimer,
    resetSession,
    forceExit,
    formatTime,
  };
}
