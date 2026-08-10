"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, FileQuestion, Plus, Search } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import QuizCard from "@/components/QuizCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { getTagsForQuizzes, type Tag } from "@/lib/quizTags";
import { useAuth } from "@/context/AuthContext";
import { getDueReviewCount } from "@/lib/reviewQueue";
import { getUserAttempts, type AttemptSummary } from "@/lib/quizAttempts";

type QuizRow = {
  id: number;
  title: string;
  description: string | null;
  updated_at: string;
  user_id: string | null;
  is_public: boolean;
  questions: { count: number }[];
};

type LearningState = "loading" | "ready";

function getDisplayName(username: string | null, email: string | undefined) {
  const trimmed = username?.trim();
  if (trimmed) return trimmed;
  const emailName = email?.split("@")[0]?.trim();
  return emailName || "bạn";
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<AttemptSummary[]>([]);
  const [dueReviewCount, setDueReviewCount] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [tagsByQuiz, setTagsByQuiz] = useState<Record<number, Tag[]>>({});
  const [loading, setLoading] = useState(true);
  const [learningLoading, setLearningLoading] = useState<LearningState>("loading");
  const [error, setError] = useState("");
  const [learningError, setLearningError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    const userId = user.id;

    async function loadHome() {
      setLoading(true);
      setLearningLoading("loading");
      setError("");
      setLearningError("");

      const [quizResult, dueResult, attemptsResult, profileResult] = await Promise.all([
        supabase
          .from("quizzes")
          .select("id, title, description, updated_at, user_id, is_public, questions:questions(count)")
          .order("updated_at", { ascending: false }),
        Promise.resolve(getDueReviewCount(userId)),
        Promise.resolve(getUserAttempts(userId, ["quiz"], 10)),
        supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
      ]);

      if (cancelled) return;

      if (quizResult.error) {
        setError(quizResult.error.message);
      } else {
        const data = quizResult.data ?? [];
        setQuizzes(data);

        const quizIds = data.map((q) => q.id);
        getTagsForQuizzes(quizIds).then((tags) => {
          if (!cancelled) setTagsByQuiz(tags);
        });

        const ownerIds = Array.from(
          new Set(data.map((q) => q.user_id).filter((id): id is string => !!id))
        );

        if (ownerIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", ownerIds);

          if (!cancelled) {
            const map: Record<string, string> = {};
            (profilesData ?? []).forEach((p) => {
              map[p.id] = p.username;
            });
            setUsernames(map);
          }
        }
      }

      if (!cancelled) {
        setDueReviewCount(dueResult);
        setRecentAttempts(attemptsResult);
        setUsername(profileResult.data?.username ?? null);
        setLoading(false);
        setLearningLoading("ready");
      }
    }

    loadHome();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const filteredQuizzes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quizzes;
    return quizzes.filter((quiz) => quiz.title.toLowerCase().includes(q));
  }, [quizzes, search]);

  const validRecentAttempts = useMemo(() => {
    const availableQuizIds = new Set(quizzes.map((quiz) => quiz.id));
    const seenQuizIds = new Set<number>();

    return recentAttempts.filter((attempt) => {
      if (attempt.quiz_id === null || !availableQuizIds.has(attempt.quiz_id)) return false;
      if (seenQuizIds.has(attempt.quiz_id)) return false;
      seenQuizIds.add(attempt.quiz_id);
      return true;
    });
  }, [recentAttempts, quizzes]);

  const recentQuiz = validRecentAttempts[0];
  const hasRecentLearning = !!recentQuiz;
  const hasCatalog = quizzes.length > 0;
  const isNewUser = !hasRecentLearning && dueReviewCount === 0;
  const primaryAction = dueReviewCount > 0
    ? "review"
    : hasRecentLearning
      ? "continue"
      : "discover";

  function handleQuizDeleted(id: number) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <RequireAuth>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <section className="mb-8" aria-labelledby="learning-entry-title">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Chào {getDisplayName(username, user?.email)} 👋
          </p>
          <h1 id="learning-entry-title" className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Hôm nay mình học gì?
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
            {isNewUser
              ? "Quizzt giúp bạn học và ôn tập bằng các bộ câu hỏi trắc nghiệm."
              : "Chọn một việc học phù hợp để bắt đầu ngay."}
          </p>
        </section>

        {learningLoading === "loading" ? (
          <Skeleton className="h-44 rounded-2xl mb-8" />
        ) : (
          <section className="mb-8" aria-labelledby="next-learning-title">
            <Card className="p-5 sm:p-6 border-primary/20 bg-primary/5 dark:bg-primary/10">
              {primaryAction === "review" && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={20} className="text-primary" />
                      <p className="text-sm font-medium text-primary">Việc nên làm tiếp theo</p>
                    </div>
                    <h2 id="next-learning-title" className="text-xl font-bold text-gray-900 dark:text-white">
                      Ôn tập hôm nay
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      Bạn có <span className="font-semibold">{dueReviewCount} câu</span> đã đến hạn ôn.
                    </p>
                  </div>
                  <Link href="/smart-review" className="shrink-0">
                    <Button variant="primary" size="lg" rightIcon={<ArrowRight size={17} />}>
                      Ôn tập ngay
                    </Button>
                  </Link>
                </div>
              )}

              {primaryAction === "continue" && recentQuiz && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={20} className="text-primary" />
                      <p className="text-sm font-medium text-primary">Việc nên làm tiếp theo</p>
                    </div>
                    <h2 id="next-learning-title" className="text-xl font-bold text-gray-900 dark:text-white">
                      Tiếp tục học
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 truncate">
                      Mở lại <span className="font-semibold">{recentQuiz.quiz_title}</span> vừa học gần đây.
                    </p>
                  </div>
                  <Link href={`/practice/${recentQuiz.quiz_id}`} className="shrink-0">
                    <Button variant="primary" size="lg" rightIcon={<ArrowRight size={17} />}>
                      Tiếp tục học
                    </Button>
                  </Link>
                </div>
              )}

              {primaryAction === "discover" && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={20} className="text-primary" />
                      <p className="text-sm font-medium text-primary">Bắt đầu với Quizzt</p>
                    </div>
                    <h2 id="next-learning-title" className="text-xl font-bold text-gray-900 dark:text-white">
                      {hasCatalog ? "Khám phá bộ đề" : "Tạo bộ đề đầu tiên"}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {hasCatalog
                        ? "Chọn một bộ đề phù hợp và bắt đầu làm bài."
                        : "Tạo bộ đề của riêng bạn để bắt đầu ôn tập."}
                    </p>
                  </div>
                  {hasCatalog ? (
                    <a href="#quiz-catalog" className="shrink-0">
                      <Button variant="primary" size="lg" rightIcon={<ArrowRight size={17} />}>
                        Khám phá bộ đề
                      </Button>
                    </a>
                  ) : (
                    <Link href="/quizzes/create" className="shrink-0">
                      <Button variant="primary" size="lg" rightIcon={<ArrowRight size={17} />}>
                        Tạo bộ đề
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </Card>

            {learningError && (
              <p className="text-danger text-sm mt-3">{learningError}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {primaryAction === "review" && recentQuiz && (
                <Link href={`/practice/${recentQuiz.quiz_id}`}>
                  <Button variant="secondary" size="sm">Tiếp tục học</Button>
                </Link>
              )}
              {primaryAction !== "discover" && (
                <a href="#quiz-catalog">
                  <Button variant="secondary" size="sm">Khám phá bộ đề</Button>
                </a>
              )}
              {primaryAction === "continue" && (
                <Link href="/quizzes/create">
                  <Button variant="secondary" size="sm">Tạo bộ đề</Button>
                </Link>
              )}
              {primaryAction === "discover" && hasCatalog && (
                <Link href="/quizzes/create">
                  <Button variant="secondary" size="sm" leftIcon={<Plus size={15} />}>Tạo bộ đề</Button>
                </Link>
              )}
            </div>
          </section>
        )}

        {validRecentAttempts.length > 0 && (
          <section className="mb-8" aria-labelledby="recent-learning-title">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h2 id="recent-learning-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Học gần đây
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mở lại bộ đề bạn vừa học.</p>
              </div>
              <Link href="/history" className="text-sm text-primary hover:underline shrink-0">
                Xem lịch sử
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {validRecentAttempts.slice(0, 2).map((attempt) => (
                <Link key={attempt.id} href={`/practice/${attempt.quiz_id}`}>
                  <Card hoverable className="p-4 h-full">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{attempt.quiz_title}</p>
                      <Badge variant="default">{Math.round((attempt.correct_count / Math.max(1, attempt.total_questions)) * 100)}%</Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mở lại để học tiếp</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section id="quiz-catalog" aria-labelledby="quiz-catalog-title">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 id="quiz-catalog-title" className="text-xl font-bold text-gray-900 dark:text-white">
                Khám phá bộ đề
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chọn bộ đề để bắt đầu làm bài.</p>
            </div>
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
            <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <FileQuestion size={40} className="mb-3 opacity-60" />
              <p className="font-medium">
                {search ? "Không tìm thấy bộ đề nào phù hợp" : "Chưa có bộ đề nào được chia sẻ"}
              </p>
              {!search && (
                <Link href="/quizzes/create" className="mt-4">
                  <Button variant="primary" leftIcon={<Plus size={16} />}>
                    Tạo bộ đề
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
        </section>
      </div>
    </RequireAuth>
  );
}
