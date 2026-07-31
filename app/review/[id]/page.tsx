"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(`quizResult:${quizId}`);
    if (raw) {
      setResult(JSON.parse(raw));
    }
    setLoaded(true);
  }, [quizId]);

  if (!loaded) return null;

  if (!result) {
    return (
      <div className="p-8 text-center text-gray-500">
        Bạn chưa làm bộ đề này. Hãy bấm &quot;Làm bài&quot; trước.
        <div className="mt-4">
          <button
            onClick={() => router.push(`/practice/${quizId}`)}
            className="px-5 py-2 rounded bg-blue-600 text-white"
          >
            Làm bài ngay
          </button>
        </div>
      </div>
    );
  }

  const correctCount = result.questions.filter(
    (q, i) => result.answers[i] === q.correct_index
  ).length;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Xem lại đáp án</h1>
      <p className="text-lg text-gray-500 mb-6">
        Đúng {correctCount}/{result.questions.length} câu
      </p>

      <div className="flex flex-col gap-6">
        {result.questions.map((question, i) => {
          const selected = result.answers[i];
          const isCorrect = selected === question.correct_index;

          return (
            <div
              key={question.id}
              className={`border rounded-lg p-4 ${
                isCorrect
                  ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                  : "border-red-300 bg-red-50 dark:bg-red-950/20"
              }`}
            >
              <p className="font-semibold mb-3">
                Câu {i + 1}. {question.content}
              </p>

              <div className="flex flex-col gap-1">
                {question.options.map((option, optIndex) => {
                  const isSelected = optIndex === selected;
                  const isTheCorrectOne = optIndex === question.correct_index;

                  let style = "border-gray-300 dark:border-gray-700";
                  if (isTheCorrectOne) {
                    style = "border-green-500 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
                  } else if (isSelected && !isCorrect) {
                    style = "border-red-500 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
                  }

                  return (
                    <div
                      key={optIndex}
                      className={`px-3 py-2 rounded border ${style}`}
                    >
                      {String.fromCharCode(65 + optIndex)}. {option}
                      {isTheCorrectOne && " ✓"}
                      {isSelected && !isCorrect && " (bạn chọn)"}
                    </div>
                  );
                })}
                {selected === null && (
                  <p className="text-sm text-gray-500 mt-1">Bạn chưa chọn đáp án cho câu này.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <button
          onClick={() => router.push(`/practice/${quizId}`)}
          className="px-5 py-2 rounded bg-gray-300 dark:bg-gray-700 dark:text-white"
        >
          Làm lại bộ đề
        </button>
      </div>
    </div>
  );
}