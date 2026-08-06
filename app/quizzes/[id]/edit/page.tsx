"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useQuizEditor } from "@/lib/useQuizEditor";
import { getQuizTags } from "@/lib/quizTags";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import QuizMetadataForm from "@/components/quiz-editor/QuizMetadataForm";
import QuestionCard from "@/components/quiz-editor/QuestionCard";

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const { user, loading: authLoading } = useAuth();

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const editor = useQuizEditor({ mode: "edit", quizId, userId: user?.id });

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: quiz } = await supabase
        .from("quizzes")
        .select("title, description, user_id, chapter_id")
        .eq("id", quizId)
        .single();

      const { data: questionData } = await supabase
        .from("questions")
        .select("id, content, options, correct_index, difficulty")
        .eq("quiz_id", quizId);

      let subjectId: number | null = null;
      if (quiz?.chapter_id) {
        const { data: chapterRow } = await supabase
          .from("chapters")
          .select("subject_id")
          .eq("id", quiz.chapter_id)
          .single();
        if (chapterRow) subjectId = chapterRow.subject_id;
      }

      const existingTags = await getQuizTags(quizId);

      if (quiz) {
        setOwnerId(quiz.user_id);
        editor.loadExisting({
          title: quiz.title,
          description: quiz.description,
          subjectId,
          chapterId: quiz.chapter_id,
          tagNames: existingTags.map((t) => t.name),
          questions: questionData ?? [],
        });
      }

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  if (authLoading || loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!user || ownerId !== user.id) {
    return <div className="p-8 text-center text-danger">Bạn không có quyền chỉnh sửa bộ đề này.</div>;
  }

  async function handleSave() {
    const result = await editor.save();
    if (result.success) {
      router.push("/");
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-up">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Chỉnh sửa bộ đề</h1>

      <div className="mb-6">
        <QuizMetadataForm
          userId={user.id}
          title={editor.title}
          onChangeTitle={editor.setTitle}
          description={editor.description}
          onChangeDescription={editor.setDescription}
          subjectId={editor.subjectId}
          chapterId={editor.chapterId}
          onChangeSubjectChapter={({ subjectId, chapterId }) => {
            editor.setSubjectId(subjectId);
            editor.setChapterId(chapterId);
          }}
          tagNames={editor.tagNames}
          onChangeTags={editor.setTagNames}
        />
      </div>

      <div className="flex flex-col gap-4">
        {editor.questions.map((q, index) => (
          <QuestionCard
            key={q.tempId}
            question={q}
            index={index}
            variant="full"
            isOpen={editor.openedIds.has(q.tempId)}
            onOpen={() => editor.openQuestion(q.tempId)}
            onChangeDifficulty={(d) => editor.updateQuestion(q.tempId, { difficulty: d })}
            onSelectCorrect={(i) => editor.selectCorrect(q.tempId, i)}
            onChangeContent={(content) => editor.updateQuestion(q.tempId, { content })}
            onChangeOption={(optIndex, value) => editor.updateOption(q.tempId, optIndex, value)}
            onDelete={() => editor.removeQuestion(q.tempId, q.id)}
          />
        ))}
      </div>

      <button
        onClick={editor.addQuestion}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm hover:border-primary hover:text-primary transition-colors"
      >
        <Plus size={16} />
        Thêm câu hỏi
      </button>

      {editor.saveError && <p className="mt-4 text-sm text-danger">{editor.saveError}</p>}

      <div className="flex gap-3 mt-6">
        <Button
          onClick={handleSave}
          disabled={editor.saving}
          loading={editor.saving}
          variant="primary"
          leftIcon={!editor.saving && <Save size={16} />}
        >
          {editor.saving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
        <Button onClick={() => router.push("/quizzes")} variant="secondary">
          Huỷ
        </Button>
      </div>
    </div>
  );
}