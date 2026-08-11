"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Settings2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useQuizEditor } from "@/lib/useQuizEditor";
import { getQuizTags } from "@/lib/quizTags";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import Badge from "@/components/ui/Badge";
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
      const { data: quiz } = await supabase.from("quizzes").select("title, description, user_id, chapter_id").eq("id", quizId).single();
      const { data: questionData } = await supabase.from("questions").select("id, content, options, correct_index, difficulty").eq("quiz_id", quizId);
      let subjectId: number | null = null;
      if (quiz?.chapter_id) {
        const { data: chapterRow } = await supabase.from("chapters").select("subject_id").eq("id", quiz.chapter_id).single();
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
      <main className="min-h-[calc(100vh-68px)] bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!user || ownerId !== user.id) {
    return (
      <main className="min-h-[calc(100vh-68px)] bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold text-foreground">Không có quyền chỉnh sửa</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Bạn không phải chủ sở hữu của bộ đề này.</p>
          <Button className="mt-6 w-full" variant="secondary" onClick={() => router.push("/quizzes")}>Quay lại thư viện</Button>
        </Card>
      </main>
    );
  }

  async function handleSave() {
    const result = await editor.save();
    if (result.success) router.push("/quizzes");
  }

  return (
    <main className="min-h-[calc(100vh-68px)] bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-10 animate-fade-up">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => router.push("/quizzes")} className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-lg px-2 py-1.5">
            <ArrowLeft size={16} /> Quay lại thư viện
          </button>
          <Badge variant="default"><Settings2 size={13} /> Chỉnh sửa</Badge>
        </div>

        <header className="mt-6 mb-7">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Chỉnh sửa bộ đề</h1>
          <p className="mt-2 text-sm sm:text-base text-muted leading-6">Cập nhật thông tin, câu hỏi và đáp án. Thay đổi sẽ được lưu vào bộ đề hiện tại.</p>
        </header>

        <Card className="p-5 sm:p-7 mb-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">Thông tin bộ đề</h2>
            <p className="mt-1 text-xs text-muted">Tên, mô tả, môn học, chương và nhãn.</p>
          </div>
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
        </Card>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Câu hỏi</h2>
              <p className="mt-1 text-sm text-muted">Chỉnh nội dung, đáp án và độ khó của từng câu.</p>
            </div>
            <Badge variant="default">{editor.questions.length} câu</Badge>
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

          <button onClick={editor.addQuestion} className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border-strong bg-surface text-muted text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary-soft/30 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <Plus size={16} /> Thêm câu hỏi
          </button>

          {editor.saveError && <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{editor.saveError}</div>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
            <Button onClick={() => router.push("/quizzes")} variant="secondary">Huỷ</Button>
            <Button onClick={handleSave} disabled={editor.saving} loading={editor.saving} variant="primary" leftIcon={!editor.saving && <Save size={16} />}>
              {editor.saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}