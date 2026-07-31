"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { extractTextFromFile } from "@/lib/fileParser";
import RequireAuth from "@/components/RequireAuth";
import { parseText, extractTitleAndBody, STANDARD_FORMAT_PROMPT, type ParsedQuestion } from "@/lib/quizParser";
export default function AddQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const [copied, setCopied] = useState(false);

async function handleCopyPrompt() {
  await navigator.clipboard.writeText(STANDARD_FORMAT_PROMPT);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
  const [quizTitle, setQuizTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      const { data } = await supabase
        .from("quizzes")
        .select("title")
        .eq("id", quizId)
        .single();
      if (data) setQuizTitle(data.title);
    }
    loadQuiz();
  }, [quizId]);

  function handleParse() {
    const { questions, errors } = parseText(rawText);
    setQuestions(questions);
    setParseErrors(errors);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError("");
    setFileLoading(true);

    try {
      const text = await extractTextFromFile(file);
      setRawText(text);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Không đọc được file.");
    } finally {
      setFileLoading(false);
      e.target.value = "";
    }
  }

  function handleSelectCorrect(questionIndex: number, optionIndex: number) {
    const updated = [...questions];
    updated[questionIndex] = { ...updated[questionIndex], correctIndex: optionIndex };
    setQuestions(updated);
  }

  const allAnswered = questions.length > 0 && questions.every((q) => q.correctIndex !== null);

  async function handleSave() {
    setSaveError("");

    if (!allAnswered) {
      setSaveError("Vui lòng chọn đáp án đúng cho tất cả câu hỏi.");
      return;
    }

    setSaving(true);

    const rows = questions.map((q) => ({
      quiz_id: quizId,
      content: q.content,
      options: q.options,
      correct_index: q.correctIndex,
    }));

    const { error } = await supabase.from("questions").insert(rows);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    router.push("/quizzes");
  }

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">Thêm câu hỏi</h1>
        <p className="text-gray-500 mb-6">Bộ đề: {quizTitle}</p>

        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">
            Upload file Word/PDF (tùy chọn):
          </label>
          <input
  type="file"
  accept=".docx,.pdf"
  onChange={handleFileUpload}
  className="text-sm cursor-pointer text-gray-700 dark:text-gray-300
    file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
    file:bg-blue-600 file:text-white file:cursor-pointer
    hover:file:bg-blue-700"
/>
          {fileLoading && <p className="text-sm text-gray-500 mt-1">Đang đọc file...</p>}
          {fileError && <p className="text-sm text-red-600 mt-1">{fileError}</p>}
        </div>

        <textarea
          rows={12}
          placeholder={`Dán câu hỏi vào đây, ví dụ:\n\nSAP là viết tắt của gì?\nA. Systems, Applications, and Products\nB. System Analysis Program\nC. Software Application Platform\nD. Standard Application Process`}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="w-full border rounded px-4 py-2 mb-4 font-mono text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        />

        <button onClick={handleParse} className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700">
          Tách câu hỏi
        </button>

        {parseErrors.length > 0 && (
  <div className="mt-4 border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
    <p className="text-yellow-700 dark:text-yellow-400 font-semibold mb-2">
      Không tách được {parseErrors.length} câu hỏi:
    </p>
    <ul className="text-sm text-yellow-700 dark:text-yellow-400 mb-4 list-disc list-inside">
      {parseErrors.map((err, i) => (
        <li key={i}>{err}</li>
      ))}
    </ul>

    <p className="text-sm mb-2">
      Nội dung của bạn không đúng định dạng chuẩn. Bạn có thể copy đoạn hướng dẫn dưới đây,
      gửi cho một AI khác (ChatGPT, Gemini...) kèm nội dung gốc, rồi dán kết quả AI trả về vào ô văn bản
      phía trên và bấm &quot;Tách câu hỏi&quot; lại.
    </p>

    <button
      onClick={handleCopyPrompt}
      className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
    >
      {copied ? "Đã copy!" : "Copy hướng dẫn định dạng"}
    </button>
  </div>
)}

        {questions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">
              Xem trước ({questions.length} câu) — chọn đáp án đúng
            </h2>

            <div className="flex flex-col gap-6">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="border rounded-lg p-4 border-gray-300 dark:border-gray-700">
                  <p className="font-semibold mb-3">Câu {qIndex + 1}: {q.content}</p>

                  <div className="flex flex-col gap-2">
                    {q.options.map((option, oIndex) => (
                      <label key={oIndex} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctIndex === oIndex}
                          onChange={() => handleSelectCorrect(qIndex, oIndex)}
                        />
                        <span>{String.fromCharCode(65 + oIndex)}. {option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {saveError && <p className="text-red-600 mt-4">{saveError}</p>}

            <button
              onClick={handleSave}
              disabled={saving || !allAnswered}
              className="mt-6 bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu câu hỏi"}
            </button>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}