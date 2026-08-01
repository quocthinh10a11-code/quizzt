"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Copy, Check, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { extractTextFromFile } from "@/lib/fileParser";
import { parseText, extractTitleAndBody, STANDARD_FORMAT_PROMPT, type ParsedQuestion } from "@/lib/quizParser";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";

export default function CreateQuizPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isPublic, setIsPublic] = useState(true);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [description, setDescription] = useState("");

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(STANDARD_FORMAT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  function handleParse() {
    const { title: extractedTitle, body } = extractTitleAndBody(rawText);

    if (!title.trim() && extractedTitle) {
      setTitle(extractedTitle);
    }

    const { questions, errors } = parseText(body);
    setQuestions(questions);
    setParseErrors(errors);
  }

  function handleSelectCorrect(questionIndex: number, optionIndex: number) {
    const updated = [...questions];
    updated[questionIndex] = { ...updated[questionIndex], correctIndex: optionIndex };
    setQuestions(updated);
  }

  const allAnswered = questions.length > 0 && questions.every((q) => q.correctIndex !== null);

  async function handleSave() {
    setSaveError("");

    if (!user) {
      setSaveError("Bạn cần đăng nhập để tạo bộ đề.");
      return;
    }
    if (!title.trim()) {
      setSaveError("Vui lòng nhập tên bộ đề.");
      return;
    }
    if (!allAnswered) {
      setSaveError("Vui lòng chọn đáp án đúng cho tất cả câu hỏi.");
      return;
    }

    setSaving(true);

    const { data: quiz, error: quizError } = await supabase
  .from("quizzes")
  .insert({ title, description: description.trim() || null, user_id: user.id, is_public: isPublic })
  .select()
  .single();

    if (quizError || !quiz) {
      setSaveError(quizError?.message ?? "Không thể tạo bộ đề.");
      setSaving(false);
      return;
    }

    const rows = questions.map((q) => ({
      quiz_id: quiz.id,
      content: q.content,
      options: q.options,
      correct_index: q.correctIndex,
    }));

    const { error: questionsError } = await supabase.from("questions").insert(rows);

    setSaving(false);

    if (questionsError) {
      setSaveError(questionsError.message);
      return;
    }

    router.push("/quizzes");
  }

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tạo bộ đề mới</h1>

        <Card className="p-6">
          <Input
            placeholder="Tên bộ đề"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-4"
          />
        <Textarea
  placeholder="Mô tả ngắn về bộ đề (tuỳ chọn)"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={2}
  className="mb-4"
/>

          <label className="flex items-center gap-2 mb-6 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            Công khai bộ đề này (người khác có thể tìm và làm bài)
          </label>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Hoặc upload file Word/PDF (nội dung sẽ đổ vào ô bên dưới để bạn kiểm tra lại)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">
                <Upload size={14} />
                Chọn file
              </span>
              <input type="file" accept=".docx,.pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            {fileLoading && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Đang đọc file...</p>}
            {fileError && <p className="text-sm text-danger mt-2">{fileError}</p>}
          </div>

          <Textarea
            rows={12}
            placeholder={`Dán câu hỏi vào đây, ví dụ:\n\nSAP là viết tắt của gì?\nA. Systems, Applications, and Products\nB. System Analysis Program\nC. Software Application Platform\nD. Standard Application Process\n\n(để trống 1 dòng rồi tiếp câu 2)`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="font-mono text-sm"
          />

          <Button onClick={handleParse} variant="primary" className="mt-4">
            Tách câu hỏi
          </Button>
        </Card>

        {parseErrors.length > 0 && (
          <Card className="mt-4 p-5 border-warning/40 bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">Không tách được {parseErrors.length} câu</Badge>
            </div>
            <ul className="text-sm text-amber-700 dark:text-amber-400 mb-4 list-disc list-inside">
              {parseErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Nội dung của bạn không đúng định dạng chuẩn. Bạn có thể copy đoạn hướng dẫn dưới đây,
              gửi cho một AI khác (ChatGPT, Gemini...) kèm nội dung gốc, rồi dán kết quả AI trả về vào ô văn bản
              phía trên và bấm &quot;Tách câu hỏi&quot; lại.
            </p>

            <Button
              onClick={handleCopyPrompt}
              variant="secondary"
              size="sm"
              leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            >
              {copied ? "Đã copy!" : "Copy hướng dẫn định dạng"}
            </Button>
          </Card>
        )}

        {questions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Xem trước ({questions.length} câu) — chọn đáp án đúng
            </h2>

            <div className="flex flex-col gap-4">
              {questions.map((q, qIndex) => (
                <Card key={qIndex} className="p-5">
                  <p className="font-medium text-gray-900 dark:text-white mb-3">
                    Câu {qIndex + 1}: {q.content}
                  </p>

                  <div className="flex flex-col gap-2">
                    {q.options.map((option, oIndex) => (
                      <label
                        key={oIndex}
                        className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                      >
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctIndex === oIndex}
                          onChange={() => handleSelectCorrect(qIndex, oIndex)}
                          className="accent-primary w-4 h-4"
                        />
                        <span>
                          {String.fromCharCode(65 + oIndex)}. {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {saveError && <p className="text-danger text-sm mt-4">{saveError}</p>}

            <Button
              onClick={handleSave}
              disabled={saving || !allAnswered}
              loading={saving}
              variant="success"
              size="lg"
              leftIcon={!saving && <Save size={16} />}
              className="mt-6"
            >
              {saving ? "Đang lưu..." : "Lưu bộ đề"}
            </Button>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}