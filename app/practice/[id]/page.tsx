"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Question = {
  id: number;
  content: string;
  options: string[];
  correct_index: number;
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
  const [minutesInput, setMinutesInput] = useState(15);
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
        .select("id, content, options, correct_index")
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

  function handleStart() {
    setStarted(true);
    if (!noLimit) {
      setTimeLeft(minutesInput * 60);
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

  if (loading) {
    return <div className="p-8 text-center">Đang tải câu hỏi...</div>;
  }

  if (questions.length === 0) {
    return <div className="p-8 text-center">Bộ đề này chưa có câu hỏi nào.</div>;
  }

  // ----- Màn hình cài đặt thời gian trước khi bắt đầu -----
  if (!started) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold mb-1">{quizTitle}</h1>
        <p className="text-gray-500 mb-6">{questions.length} câu hỏi</p>

        <div className="border rounded-lg p-6 border-gray-300 dark:border-gray-700 text-left">
          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={noLimit}
              onChange={(e) => setNoLimit(e.target.checked)}
            />
            Không giới hạn thời gian
          </label>

          <label className={`block ${noLimit ? "opacity-40 pointer-events-none" : ""}`}>
            <span className="text-sm text-gray-500">Thời gian làm bài (phút)</span>
            <input
              type="number"
              min={1}
              value={minutesInput}
              onChange={(e) => setMinutesInput(Number(e.target.value) || 1)}
              className="w-full mt-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              disabled={noLimit}
            />
          </label>
        </div>

        <button
          onClick={handleStart}
          className="mt-6 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition w-full"
        >
          Bắt đầu làm bài
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-1">
        <h1 className="text-2xl font-bold">{quizTitle}</h1>
        {!submitted && timeLeft !== null && (
          <span
            className={`px-3 py-1 rounded font-mono text-sm ${
              timeLeft <= 30
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            ⏱ {formatTime(timeLeft)}
          </span>
        )}
      </div>

      {!submitted ? (
        <>
          <p className="text-gray-500 mb-4">
            Câu {currentIndex + 1} / {questions.length}
          </p>

          <p className="text-lg mb-6">{questions[currentIndex].content}</p>

          <div className="flex flex-col gap-3">
            {questions[currentIndex].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                className={`text-left px-4 py-3 rounded-lg border ${
                  answers[currentIndex] === index
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700"
                }`}
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-5 py-2 rounded bg-gray-300 disabled:opacity-40"
            >
              Previous
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded bg-red-600 text-white"
              >
                Submit
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-5 py-2 rounded bg-green-600 text-white"
              >
                Next
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center mt-8">
          <h2 className="text-3xl font-bold mb-4">Kết quả</h2>
          <p className="text-xl mb-6">
            Đúng{" "}
            {questions.filter((q, i) => answers[i] === q.correct_index).length}/
            {questions.length} câu
          </p>

          <button
            onClick={() => router.push(`/review/${quizId}`)}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Xem lại đáp án
          </button>
        </div>
      )}
    </div>
  );
}