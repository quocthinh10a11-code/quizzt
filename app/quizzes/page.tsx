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
import { getTagsForQuizzes, getUserTags, type Tag } from "@/lib/quizTags";
import { useAuth } from "@/context/AuthContext";
import Select from "@/components/ui/Select";

type QuizRow = {
  id: number;
  title: string;
  description: string | null;
  updated_at: string;
  user_id: string | null;
  is_public: boolean;
  chapter_id: number | null;
  questions: { count: number }[];
};

export default function MyQuizzesPage() {
  const { user, loading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [chapters, setChapters] = useState<{ id: number; name: string; subject_id: number }[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterChapter, setFilterChapter] = useState<string>("all");
  const [tagsByQuiz, setTagsByQuiz] = useState<Record<number, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    async function loadFilters() {
      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");
      setSubjects(subjectData ?? []);

      const { data: chapterData } = await supabase
        .from("chapters")
        .select("id, name, subject_id")
        .in("subject_id", (subjectData ?? []).map((s) => s.id));
      setChapters(chapterData ?? []);

      const userTags = await getUserTags(user!.id);
      setAllTags(userTags);
    }
    loadFilters();
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;

    async function loadQuizzes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, description, updated_at, user_id, is_public, chapter_id, questions:questions(count)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setQuizzes(data ?? []);
        const quizIds = (data ?? []).map((q) => q.id);
        getTagsForQuizzes(quizIds).then(setTagsByQuiz);
      }
      setLoading(false);
    }

    loadQuizzes();
  }, [authLoading, user]);

  function handleQuizDeleted(id: number) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  function toggleTagFilter(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  const chaptersOfSelectedSubject = useMemo(() => {
    if (filterSubject === "all") return [];
    return chapters.filter((c) => c.subject_id === Number(filterSubject));
  }, [chapters, filterSubject]);

  const filteredQuizzes = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = quizzes;

    if (q) {
      result = result.filter((quiz) => quiz.title.toLowerCase().includes(q));
    }

    if (filterChapter !== "all") {
      result = result.filter((quiz) => quiz.chapter_id === Number(filterChapter));
    } else if (filterSubject !== "all") {
      const chapterIds = new Set(chaptersOfSelectedSubject.map((c) => c.id));
      result = result.filter((quiz) => quiz.chapter_id !== null && chapterIds.has(quiz.chapter_id));
    }

    if (selectedTagIds.length > 0) {
      result = result.filter((quiz) => {
        const quizTagIds = (tagsByQuiz[quiz.id] ?? []).map((t) => t.id);
        return selectedTagIds.some((id) => quizTagIds.includes(id));
      });
    }

    return result;
  }, [quizzes, search, filterSubject, filterChapter, chaptersOfSelectedSubject, selectedTagIds, tagsByQuiz]);

  return (
    <RequireAuth>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bộ đề của bạn
          </h1>
          <Link href="/quizzes/create" className="shrink-0">
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

        <div className="mb-4 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="w-full sm:w-56">
            <Select
              options={[{ value: "all", label: "Tất cả môn học" }, ...subjects.map((s) => ({ value: String(s.id), label: s.name }))]}
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setFilterChapter("all");
              }}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              options={[{ value: "all", label: "Tất cả chương" }, ...chaptersOfSelectedSubject.map((c) => ({ value: String(c.id), label: c.name }))]}
              value={filterChapter}
              onChange={(e) => setFilterChapter(e.target.value)}
              disabled={filterSubject === "all"}
            />
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Nhãn:</span>
            {allTags.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTagFilter(tag.id)}
                  className={
                    active
                      ? "text-xs px-2.5 py-1 rounded-full bg-primary text-white transition-colors"
                      : "text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors"
                  }
                >
                  {tag.name}
                </button>
              );
            })}
            {selectedTagIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTagIds([])}
                className="text-xs text-gray-400 hover:text-danger underline ml-1"
              >
                Bỏ lọc
              </button>
            )}
          </div>
        )}

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
                tags={tagsByQuiz[quiz.id] ?? []}
                onDeleted={handleQuizDeleted}
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
