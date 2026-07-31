"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext"; // sửa đường dẫn đúng theo project của bạn

type EditableQuestion = {
  id: number | null; // null = câu mới thêm, chưa lưu
  tempId: string; // key ổn định cho React, không đổi khi id thật thay đổi
  content: string;
  options: string[];
  correct_index: number;
};

function makeTempId() {
  return Math.random().toString(36).slice(2);
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: quiz } = await supabase
        .from("quizzes")
        .select("title, user_id")
        .eq("id", quizId)
        .single();

      const { data: questionData } = await supabase
        .from("questions")
        .select("id, content, options, correct_index")
        .eq("quiz_id", quizId);

      if (quiz) {
        setTitle(quiz.title);
        setOwnerId(quiz.user_id);
      }
      if (questionData) {
        setQuestions(
          questionData.map((q) => ({
            id: q.id,
            tempId: makeTempId(),
            content: q.content,
            options: q.options,
            correct_index: q.correct_index,
          }))
        );
      }

      setLoading(false);
    }

    load();
  }, [quizId]);

  if (authLoading || loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  // Chặn nếu không phải chủ sở hữu (RLS ở Supabase cũng đã chặn ở tầng backend,
  // đây là chặn thêm ở UI để trải nghiệm rõ ràng hơn)
  if (!user || ownerId !== user.id) {
    return (
      <div className="p-8 text-center text-red-600">
        Bạn không có quyền chỉnh sửa bộ đề này.
      </div>
    );
  }

  function updateQuestion(tempId: string, patch: Partial<EditableQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q))
    );
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

    // Validate cơ bản
    for (const q of questions) {
      if (!q.content.trim() || q.options.some((o) => !o.trim())) {
        setMessage("Mỗi câu hỏi cần đủ nội dung và 4 đáp án, không được để trống.");
        setSaving(false);
        return;
      }
    }

    // 1. Cập nhật tiêu đề
    const { error: titleError } = await supabase
      .from("quizzes")
      .update({ title })
      .eq("id", quizId);

    if (titleError) {
      setMessage("Lỗi khi lưu tiêu đề: " + titleError.message);
      setSaving(false);
      return;
    }

    // 2. Xoá các câu đã bị xoá trên UI
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

    // 3. Cập nhật câu đã có id
    const existing = questions.filter((q) => q.id !== null);
    for (const q of existing) {
      const { error } = await supabase
        .from("questions")
        .update({
          content: q.content,
          options: q.options,
          correct_index: q.correct_index,
        })
        .eq("id", q.id);

      if (error) {
        setMessage(`Lỗi khi lưu câu "${q.content.slice(0, 20)}...": ${error.message}`);
        setSaving(false);
        return;
      }
    }

    // 4. Thêm các câu mới (id === null)
    const newOnes = questions.filter((q) => q.id === null);
    if (newOnes.length > 0) {
      const { error } = await supabase.from("questions").insert(
        newOnes.map((q) => ({
          quiz_id: quizId,
          content: q.content,
          options: q.options,
          correct_index: q.correct_index,
        }))
      );

      if (error) {
        setMessage("Lỗi khi thêm câu hỏi mới: " + error.message);
        setSaving(false);
        return;
      }
    }

    setDeletedIds([]);
    setMessage("Đã lưu thành công!");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chỉnh sửa bộ đề</h1>

      <label className="block mb-6">
        <span className="text-sm text-gray-500">Tiêu đề bộ đề</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mt-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        />
      </label>

      <div className="flex flex-col gap-6">
        {questions.map((q, index) => (
          <div
            key={q.tempId}
            className="border rounded-lg p-4 border-gray-300 dark:border-gray-700"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Câu {index + 1}</span>
              <button
                onClick={() => removeQuestion(q.tempId, q.id)}
                className="text-red-600 text-sm hover:underline"
              >
                Xoá câu này
              </button>
            </div>

            <textarea
              value={q.content}
              onChange={(e) => updateQuestion(q.tempId, { content: e.target.value })}
              placeholder="Nội dung câu hỏi"
              className="w-full px-3 py-2 border rounded mb-3 dark:bg-gray-800 dark:border-gray-700"
              rows={2}
            />

            <div className="flex flex-col gap-2">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.tempId}`}
                    checked={q.correct_index === optIndex}
                    onChange={() => updateQuestion(q.tempId, { correct_index: optIndex })}
                  />
                  <span className="w-5">{String.fromCharCode(65 + optIndex)}.</span>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(q.tempId, optIndex, e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Chọn nút tròn ở đầu dòng để đánh dấu đáp án đúng.
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="mt-4 px-4 py-2 rounded border border-dashed border-gray-400 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 w-full"
      >
        + Thêm câu hỏi
      </button>

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.startsWith("Đã lưu") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button
          onClick={() => router.push("/quizzes")}
          className="px-5 py-2 rounded bg-gray-300 dark:bg-gray-700 dark:text-white"
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}