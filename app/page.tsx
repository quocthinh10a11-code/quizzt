"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, FileQuestion } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import QuizCard from "@/components/QuizCard";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { getTagsForQuizzes, type Tag } from "@/lib/quizTags";
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

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [tagsByQuiz, setTagsByQuiz] = useState<Record<number, Tag[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;

    async function loadQuizzes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, description, updated_at, user_id, is_public, questions:questions(count)")
        .order("updated_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setQuizzes(data ?? []);

      const quizIds = (data ?? []).map((q) => q.id);
      getTagsForQuizzes(quizIds).then(setTagsByQuiz);

      const ownerIds = Array.from(
        new Set((data ?? []).map((q) => q.user_id).filter((id): id is string => !!id))
      );

      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ownerIds);

        const map: Record<string, string> = {};
        (profilesData ?? []).forEach((p) => {
          map[p.id] = p.username;
        });
        setUsernames(map);
      }

      setLoading(false);
    }

    loadQuizzes();
  }, [authLoading, user?.id]);

  function handleQuizDeleted(id: number) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  const filteredQuizzes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter((quiz) => quiz.title.toLowerCase().includes(q));
  }, [quizzes, search]);

  return (
    <RequireAuth>
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Tất cả bộ đề
        </h1>

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
              {search ? "Không tìm thấy bộ đề nào phù hợp" : "Chưa có bộ đề nào được chia sẻ"}
            </p>
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
                ownerUsername={quiz.user_id ? usernames[quiz.user_id] ?? null : null}
                questions={quiz.questions[0]?.count ?? 0}
                ownerId={quiz.user_id}
                isPublic={quiz.is_public}
                tags={tagsByQuiz[quiz.id] ?? []}
                onDeleted={handleQuizDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}