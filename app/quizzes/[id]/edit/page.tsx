"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Plus, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useQuizEditor } from "@/lib/useQuizEditor";
import { getQuizTags } from "@/lib/quizTags";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Skeleton from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import SubjectChapterPicker from "@/components/SubjectChapterPicker";
import TagPicker from "@/components/TagPicker";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
];

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
    return (
      <div className="p-8 text-center text-danger">
        Bạn không có quyền chỉnh sửa bộ đề này.
      </div>
    );
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

      <Input
        label="Tiêu đề bộ đề"
        value={editor.title}
        onChange={(e) => editor.setTitle(e.target.value)}
        className="mb-6"
      />
      <Textarea
        label="Mô tả (tuỳ chọn)"
        value={editor.description}
        onChange={(e) => editor.setDescription(e.target.value)}
        rows={2}
        className="mb-6"
      />
      {user && (
        <div className="mb-6">
          <SubjectChapterPicker
            userId={user.id}
            subjectId={editor.subjectId}
            chapterId={editor.chapterId}
            onChange={({ subjectId, chapterId }) => {
              editor.setSubjectId(subjectId);
              editor.setChapterId(chapterId);
            }}
          />
        </div>
      )}
      {user && (
        <div className="mb-6">
          <TagPicker userId={user.id} selectedNames={editor.tagNames} onChange={editor.setTagNames} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {editor.questions.map((q, index) => {
          const isOpen = editor.openedIds.has(q.tempId);
          return (
            <Card key={q.tempId} className="p-5">
              <div className="flex justify-between items-center mb-3 gap-3">
                <span className="font-semibold text-gray-900 dark:text-white">Câu {index + 1}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <Select
                      options={DIFFICULTY_OPTIONS}
                      value={q.difficulty}
                      onFocus={() => editor.openQuestion(q.tempId)}
                      onChange={(e) =>
                        editor.updateQuestion(q.tempId, { difficulty: e.target.value as "easy" | "medium" | "hard" })
                      }
                    />
                  </div>
                  <button
                    onClick={() => editor.removeQuestion(q.tempId, q.id)}
                    className="inline-flex items-center gap-1 text-danger text-sm hover:underline"
                  >
                    <Trash2 size={14} />
                    Xoá câu này
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div className="animate-fade-up">
                  <Textarea
                    value={q.content}
                    onChange={(e) => editor.updateQuestion(q.tempId, { content: e.target.value })}
                    placeholder="Nội dung câu hỏi"
                    rows={2}
                    className="mb-3"
                  />

                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.tempId}`}
                          checked={q.correctIndex === optIndex}
                          onChange={() => editor.selectCorrect(q.tempId, optIndex)}
                          className="accent-primary w-4 h-4 shrink-0"
                        />
                        <span className="w-5 text-sm text-gray-500 dark:text-gray-400">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => editor.updateOption(q.tempId, optIndex, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Chọn nút tròn ở đầu dòng để đánh dấu đáp án đúng.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  Chọn độ khó bên trên để thiết lập nội dung và đáp án cho câu này.
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <button
        onClick={editor.addQuestion}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm hover:border-primary hover:text-primary transition-colors"
      >
        <Plus size={16} />
        Thêm câu hỏi
      </button>

      {editor.saveError && (
        <p className="mt-4 text-sm text-danger">{editor.saveError}</p>
      )}

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