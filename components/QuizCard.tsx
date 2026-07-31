"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext"; // đổi đúng đường dẫn thật

type QuizCardProps = {
  id: number;
  title: string;
  questions: number;
  ownerId: string | null;
  isPublic: boolean;
};

export default function QuizCard({ id, title, questions, ownerId, isPublic }: QuizCardProps) {
  const { user } = useAuth();
  const isOwner = !!user && user.id === ownerId;

  const [publicState, setPublicState] = useState(isPublic);
  const [toggling, setToggling] = useState(false);

  async function handleTogglePublic() {
    if (toggling) return;

    const next = !publicState;
    setPublicState(next); // đổi UI ngay (optimistic)
    setToggling(true);

    const { error } = await supabase
      .from("quizzes")
      .update({ is_public: next })
      .eq("id", id);

    if (error) {
      setPublicState(!next); // lỗi -> hoàn tác lại trạng thái cũ
      alert("Không thể đổi trạng thái: " + error.message);
    }

    setToggling(false);
  }

  return (
    <div className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-md">
      <div className="flex justify-between items-start gap-3">
        <h2 className="text-2xl font-bold text-black dark:text-white">{title}</h2>

        {isOwner && (
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            title={publicState ? "Đang công khai — bấm để chuyển sang riêng tư" : "Đang riêng tư — bấm để công khai"}
            className={`shrink-0 flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-full transition disabled:opacity-50 ${
              publicState
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            <span
              className={`relative inline-block w-8 h-4 rounded-full transition-colors ${
                publicState ? "bg-green-500" : "bg-gray-400 dark:bg-gray-500"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                  publicState ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
            {publicState ? "Công khai" : "Riêng tư"}
          </button>
        )}
      </div>

      <p className="mt-2 text-gray-600 dark:text-gray-400">{questions} câu hỏi</p>

      <div className="mt-5 flex gap-3 flex-wrap">
        <Link
          href={`/practice/${id}`}
          className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
        >
          Làm bài
        </Link>

        <Link
          href={`/review/${id}`}
          className="rounded bg-green-600 px-5 py-2 text-white hover:bg-green-700"
        >
          Ôn tập
        </Link>

        {isOwner && (
          <>
            <Link
              href={`/quizzes/${id}/add-questions`}
              className="rounded bg-gray-600 px-5 py-2 text-white hover:bg-gray-700"
            >
              + Thêm câu hỏi
            </Link>
            <Link
              href={`/quizzes/${id}/edit`}
              className="rounded bg-orange-600 px-5 py-2 text-white hover:bg-orange-700"
            >
              ✎ Chỉnh sửa
            </Link>
          </>
        )}
      </div>
    </div>
  );
}