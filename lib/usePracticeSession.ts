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

export function usePracticeSession({ questions, userId, quizId, quizTitle, attemptType, storageKey }: Params) {
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [started, setStarted] = useState(false);
  const [minutesInput, setMinutesInput] = useState("15");
  const [noLimit, setNoLimit] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Reset câu trả lời mỗi khi danh sách câu hỏi thay đổi (ví dụ đổi bộ đề đang chọn)
  useEffect(() => {
    setAnswers(Array(questions.length).fill(null));
  }, [questions]);

  function resetSession() {
    setAnswers(Array(questions.length).fill(null));
    setCurrentIndex(0);
    setSubmitted(false);
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

    const { error } = await saveQuizAttempt({
      userId,
      quizId,
      quizTitle,
      timeTakenSeconds,
      answers: attemptAnswers,
      attemptType,
    });

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

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return {
    currentIndex,
    setCurrentIndex,
    answers,
    submitted,
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
    formatTime,
  };
}