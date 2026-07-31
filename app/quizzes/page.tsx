"use client";
import RequireAuth from "@/components/RequireAuth";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuizCard from "@/components/QuizCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext"; // đổi đúng đường dẫn thật

type QuizRow = {
  id: number;
  title: string;
  user_id: string | null;
  is_public: boolean;
  questions: { count: number }[];
};

export default function QuizzesPage() {
  const { user, loading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return; // đợi biết user là ai trước khi query, để RLS trả đúng dữ liệu

    async function loadQuizzes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, user_id, is_public, questions:questions(count)");

      if (error) {
        setError(error.message);
      } else {
        setQuizzes(data ?? []);
      }
      setLoading(false);
    }

    loadQuizzes();
  }, [authLoading, user?.id]);

  if (authLoading || loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Lỗi tải dữ liệu: {error}</div>;
  }

  return (
    <RequireAuth>
      <div className="p-8">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Danh sách bộ đề</h1>
          <Link
            href="/quizzes/create"
            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
          >
            + Tạo bộ đề
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              id={quiz.id}
              title={quiz.title}
              questions={quiz.questions[0]?.count ?? 0}
              ownerId={quiz.user_id}
              isPublic={quiz.is_public}
            />
          ))}
        </div>
      </div>
    </div>
    </RequireAuth>
    );
  }