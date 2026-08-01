"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, FileQuestion } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import QuizCard from "@/components/QuizCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type QuizRow = {
  id: number;
  title: string;
  description: string | null;
  updated_at: string;
  user_id: string | null;
  is_public: boolean;
  questions: { count: number }[];
};

export default function MyQuizzesPage() {
  const { user, loading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    async function loadQuizzes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, description, updated_at, user_id, is_public, questions:questions(count)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setQuizzes(data ?? []);
      }
      setLoading(false);
    }

    loadQuizzes();
  }, [authLoading, user]);

  const filteredQuizzes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter((quiz) => quiz.title.toLowerCase().includes(q));
  }, [quizzes, search]);

  return (
    <RequireAuth>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bộ đề của bạn
          </h1>
          <Link href="/quizzes/create" className="hidden sm:block">
            <Button variant="primary" leftIcon={<Plus size={16} />}>
              Tạo bộ đề
            </Button>
          </Link>
        </div>

        <div className="mb-6 max-w-sm">
          <Input
            placeholder="Tìm bộ đề theo tên..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-danger text-sm mb-4">Lỗi tải dữ liệu: {error}</p>
        )}

        {authLoading || loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-gray-500 dark:text-gray-400">
            <FileQuestion size={40} className="mb-3 opacity-60" />
            <p className="font-medium">
              {search ? "Không tìm thấy bộ đề nào phù hợp" : "Bạn chưa tạo bộ đề nào"}
            </p>
            {!search && (
              <Link href="/quizzes/create" className="mt-4">
                <Button variant="primary" leftIcon={<Plus size={16} />}>
                  Tạo bộ đề đầu tiên
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                id={quiz.id}
                title={quiz.title}
                description={quiz.description}
                updatedAt={quiz.updated_at}
                ownerUsername={null}
                questions={quiz.questions[0]?.count ?? 0}
                ownerId={quiz.user_id}
                isPublic={quiz.is_public}
              />
            ))}
          </div>
        )}

        <Link href="/quizzes/create" className="sm:hidden fixed bottom-6 right-6 z-20">
          <Button variant="primary" size="icon" className="w-14 h-14 rounded-full shadow-lg">
            <Plus size={22} />
          </Button>
        </Link>
      </div>
    </RequireAuth>
  );
}