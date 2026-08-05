"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Plus, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Skeleton from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import SubjectChapterPicker from "@/components/SubjectChapterPicker";
import TagPicker from "@/components/TagPicker";
import { getQuizTags, syncQuizTags } from "@/lib/quizTags";
const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
];
type EditableQuestion = {
  id: number | null;
  tempId: string;
  content: string;
  options: string[];
  correct_index: number;
  difficulty: "easy" | "medium" | "hard";
};
function makeTempId() {
  return Math.random().toString(36).slice(2);
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const { user, loading: authLoading } = useAuth();
  const [description, setDescription] = useState("");
  const [openedTempIds, setOpenedTempIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [tagNames, setTagNames] = useState<string[]>([]);
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


      if (quiz) {
  setTitle(quiz.title);
  setDescription(quiz.description ?? "");
  setOwnerId(quiz.user_id);
  setChapterId(quiz.chapter_id);

  if (quiz.chapter_id) {
    const { data: chapterRow } = await supabase
      .from("chapters")
      .select("subject_id")
      .eq("id", quiz.chapter_id)
      .single();
    if (chapterRow) setSubjectId(chapterRow.subject_id);
  }
}
      if (questionData) {
  const loaded = questionData.map((q) => ({
    id: q.id,
    tempId: makeTempId(),
    content: q.content,
    options: q.options,
    correct_index: q.correct_index,
    difficulty: q.difficulty,
  }));
  setQuestions(loaded);
  setOpenedTempIds(new Set(loaded.map((q) => q.tempId))); // <-- thêm dòng này
}

      const existingTags = await getQuizTags(quizId);
      setTagNames(existingTags.map((t) => t.name));

      setLoading(false);
    }

    load();
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

  function updateQuestion(tempId: string, patch: Partial<EditableQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q))
    );
  }
  function handleOpenDifficulty(tempId: string) {
  setOpenedTempIds((prev) => new Set(prev).add(tempId));
}
  function updateOption(tempId: string, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const newOptions = [...q.options];
        newOptions[optIndex] = value;
        return { ...q, options: newOptions };
      })
    );
  }

  function addQuestion() {
  setQuestions((prev) => [
    ...prev,
    {
      id: null,
      tempId: makeTempId(),
      content: "",
      options: ["", "", "", ""],
      correct_index: 0,
      difficulty: "medium",
    },
  ]);
}

  function removeQuestion(tempId: string, id: number | null) {
    if (id !== null) {
      setDeletedIds((prev) => [...prev, id]);
    }
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    if (!title.trim()) {
      setMessage("Vui lòng nhập tên bộ đề.");
      setSaving(false);
      return;
    }
    if (title.trim().length > 200) {
      setMessage("Tên bộ đề không được vượt quá 200 ký tự.");
      setSaving(false);
      return;
    }

    for (const q of questions) {
      if (!q.content.trim() || q.options.some((o) => !o.trim())) {
        setMessage("Mỗi câu hỏi cần đủ nội dung và 4 đáp án, không được để trống.");
        setSaving(false);
        return;
      }
    }

    const { error: titleError } = await supabase
  .from("quizzes")
  .update({ title, description: description.trim() || null, chapter_id: chapterId })
  .eq("id", quizId);

    if (titleError) {
      setMessage("Lỗi khi lưu tiêu đề: " + titleError.message);
      setSaving(false);
      return;
    }

    if (deletedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("questions")
        .delete()
        .in("id", deletedIds);

      if (deleteError) {
        setMessage("Lỗi khi xoá câu hỏi: " + deleteError.message);
        setSaving(false);
        return;
      }
    }

    const existing = questions.filter((q) => q.id !== null);
    for (const q of existing) {
      const { error } = await supabase
  .from("questions")
  .update({
    content: q.content,
    options: q.options,
    correct_index: q.correct_index,
    difficulty: q.difficulty,
  })
  .eq("id", q.id);

      if (error) {
        setMessage(`Lỗi khi lưu câu "${q.content.slice(0, 20)}...": ${error.message}`);
        setSaving(false);
        return;
      }
    }

    const newOnes = questions.filter((q) => q.id === null);
    if (newOnes.length > 0) {
      const { error } = await supabase.from("questions").insert(
  newOnes.map((q) => ({
    quiz_id: quizId,
    content: q.content,
    options: q.options,
    correct_index: q.correct_index,
    difficulty: q.difficulty,
  }))
);
      if (error) {
        setMessage("Lỗi khi thêm câu hỏi mới: " + error.message);
        setSaving(false);
        return;
      }
    }

    if (!user) {
      setMessage("Bạn cần đăng nhập để lưu nhãn.");
      setSaving(false);
      return;
    }

    const { error: tagsError } = await syncQuizTags(quizId, user.id, tagNames);

    if (tagsError) {
      setMessage("Lỗi khi lưu nhãn: " + tagsError);
      setSaving(false);
      return;
    }

    setDeletedIds([]);
setSaving(false);
router.push("/");
  }

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-up">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Chỉnh sửa bộ đề</h1>

      <Input
        label="Tiêu đề bộ đề"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-6"
      />
      <Textarea
  label="Mô tả (tuỳ chọn)"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={2}
  className="mb-6"
/>
{user && (
  <div className="mb-6">
    <SubjectChapterPicker
      userId={user.id}
      subjectId={subjectId}
      chapterId={chapterId}
      onChange={({ subjectId, chapterId }) => {
        setSubjectId(subjectId);
        setChapterId(chapterId);
      }}
    />
  </div>
)}
{user && (
  <div className="mb-6">
    <TagPicker
      userId={user.id}
      selectedNames={tagNames}
      onChange={setTagNames}
    />
  </div>
)}
      <div className="flex flex-col gap-4">
        {questions.map((q, index) => (
          <Card key={q.tempId} className="p-5">
  <div className="flex justify-between items-center mb-3 gap-3">
    <span className="font-semibold text-gray-900 dark:text-white">Câu {index + 1}</span>
    <div className="flex items-center gap-3">
      <div className="w-32">
        <Select
          options={DIFFICULTY_OPTIONS}
          value={q.difficulty}
          onFocus={() => handleOpenDifficulty(q.tempId)}
          onChange={(e) =>
            updateQuestion(q.tempId, { difficulty: e.target.value as "easy" | "medium" | "hard" })
          }
        />
      </div>
      <button
        onClick={() => removeQuestion(q.tempId, q.id)}
        className="inline-flex items-center gap-1 text-danger text-sm hover:underline"
      >
        <Trash2 size={14} />
        Xoá câu này
      </button>
    </div>
  </div>

  {openedTempIds.has(q.tempId) ? (
    <div className="animate-fade-up">
      <Textarea
        value={q.content}
        onChange={(e) => updateQuestion(q.tempId, { content: e.target.value })}
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
              checked={q.correct_index === optIndex}
              onChange={() => updateQuestion(q.tempId, { correct_index: optIndex })}
              className="accent-primary w-4 h-4 shrink-0"
            />
            <span className="w-5 text-sm text-gray-500 dark:text-gray-400">
              {String.fromCharCode(65 + optIndex)}.
            </span>
            <Input
              value={opt}
              onChange={(e) => updateOption(q.tempId, optIndex, e.target.value)}
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
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm hover:border-primary hover:text-primary transition-colors"
      >
        <Plus size={16} />
        Thêm câu hỏi
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.startsWith("Đã lưu") ? "text-success" : "text-danger"}`}>
          {message}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={saving} loading={saving} variant="primary" leftIcon={!saving && <Save size={16} />}>
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
        <Button onClick={() => router.push("/quizzes")} variant="secondary">
          Huỷ
        </Button>
      </div>
    </div>
  );
}