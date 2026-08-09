"use client";

import { useEffect, useMemo, useState } from "react";
import { FileQuestion, Search, Sparkles, Plus } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import QuizCard from "@/components/QuizCard";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { getTagsForQuizzes, type Tag } from "@/lib/quizTags";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

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
        .select(
          "id, title, description, updated_at, user_id, is_public, questions:questions(count)"
        )
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
        new Set(
          (data ?? [])
            .map((q) => q.user_id)
            .filter((id): id is string => !!id)
        )
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
      <main className="min-h-[calc(100vh-68px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          {/* Header */}
          <section className="mb-8 sm:mb-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-4">
                  <Sparkles size={13} />
                  Không gian học tập của bạn
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Tất cả bộ đề
                </h1>

                <p className="mt-2 text-sm sm:text-base leading-6 text-muted">
                  Khám phá, luyện tập và ôn lại kiến thức theo cách phù hợp với bạn.
                </p>
              </div>

              <Link
                href="/quizzes/create"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary-hover hover:-translate-y-px transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <Plus size={17} />
                Tạo bộ đề
              </Link>
            </div>

            <div className="mt-6 max-w-xl">
              <Input
                placeholder="Tìm bộ đề theo tên..."
                leftIcon={<Search size={17} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </section>

          {error && (
            <div className="mb-6 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              Lỗi tải dữ liệu: {error}
            </div>
          )}

          {authLoading || loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-16 sm:py-20 text-center">
              <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-soft text-primary">
                <FileQuestion size={26} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-foreground">
                {search
                  ? "Không tìm thấy bộ đề phù hợp"
                  : "Chưa có bộ đề nào được chia sẻ"}
              </h2>

              <p className="mt-2 max-w-md mx-auto text-sm leading-6 text-muted">
                {search
                  ? "Thử tìm kiếm bằng một từ khóa khác hoặc kiểm tra lại tên bộ đề."
                  : "Hãy tạo bộ đề đầu tiên để bắt đầu xây dựng không gian học tập của bạn."}
              </p>

              {!search && (
                <Link
                  href="/quizzes/create"
                  className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary-hover transition-colors"
                >
                  <Plus size={17} />
                  Tạo bộ đề đầu tiên
                </Link>
              )}
            </div>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted">
                  <span className="font-semibold text-foreground">
                    {filteredQuizzes.length}
                  </span>{" "}
                  bộ đề
                  {search && " phù hợp"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
                {filteredQuizzes.map((quiz) => (
                  <QuizCard
                    key={quiz.id}
                    id={quiz.id}
                    title={quiz.title}
                    description={quiz.description}
                    updatedAt={quiz.updated_at}
                    ownerUsername={
                      quiz.user_id ? usernames[quiz.user_id] ?? null : null
                    }
                    questions={quiz.questions[0]?.count ?? 0}
                    ownerId={quiz.user_id}
                    isPublic={quiz.is_public}
                    tags={tagsByQuiz[quiz.id] ?? []}
                    onDeleted={handleQuizDeleted}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </RequireAuth>
  );
}
