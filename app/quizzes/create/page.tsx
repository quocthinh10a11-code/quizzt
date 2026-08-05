"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Copy, Check, Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import { STANDARD_FORMAT_PROMPT } from "@/lib/quizParser";
import { useQuizEditor } from "@/lib/useQuizEditor";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import SubjectChapterPicker from "@/components/SubjectChapterPicker";
import TagPicker from "@/components/TagPicker";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
];

export default function CreateQuizPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const editor = useQuizEditor({ mode: "create", userId: user?.id });

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(STANDARD_FORMAT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    const result = await editor.save();
    if (result.success) {
      router.push("/quizzes");
    }
  }

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tạo bộ đề mới</h1>

        <Card className="p-6">
          <Input
            placeholder="Tên bộ đề"
            value={editor.title}
            onChange={(e) => editor.setTitle(e.target.value)}
            className="mb-4"
          />
          <Textarea
            placeholder="Mô tả ngắn về bộ đề (tuỳ chọn)"
            value={editor.description}
            onChange={(e) => editor.setDescription(e.target.value)}
            rows={2}
            className="mb-4"
          />
          {user && (
            <SubjectChapterPicker
              userId={user.id}
              subjectId={editor.subjectId}
              chapterId={editor.chapterId}
              onChange={({ subjectId, chapterId }) => {
                editor.setSubjectId(subjectId);
                editor.setChapterId(chapterId);
              }}
            />
          )}
          {user && (
            <div className="mt-4">
              <TagPicker userId={user.id} selectedNames={editor.tagNames} onChange={editor.setTagNames} />
            </div>
          )}

          <label className="flex items-center gap-2 mb-6 mt-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={editor.isPublic}
              onChange={(e) => editor.setIsPublic(e.target.checked)}
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
              <input type="file" accept=".docx,.pdf" onChange={editor.handleFileUpload} className="hidden" />
            </label>
            {editor.fileLoading && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Đang đọc file...</p>}
            {editor.fileError && <p className="text-sm text-danger mt-2">{editor.fileError}</p>}
          </div>

          <Textarea
            rows={12}
            placeholder={`Dán câu hỏi vào đây, ví dụ:\n\nSAP là viết tắt của gì?\nA. Systems, Applications, and Products\nB. System Analysis Program\nC. Software Application Platform\nD. Standard Application Process\n\n(để trống 1 dòng rồi tiếp câu 2)`}
            value={editor.rawText}
            onChange={(e) => editor.setRawText(e.target.value)}
            className="font-mono text-sm"
          />

          <Button onClick={editor.handleParse} variant="primary" className="mt-4">
            Tách câu hỏi
          </Button>
        </Card>

        {editor.parseErrors.length > 0 && (
          <Card className="mt-4 p-5 border-warning/40 bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">Không tách được {editor.parseErrors.length} câu</Badge>
            </div>
            <ul className="text-sm text-amber-700 dark:text-amber-400 mb-4 list-disc list-inside">
              {editor.parseErrors.map((err, i) => (
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

        {editor.questions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Xem trước ({editor.questions.length} câu) — chọn đáp án đúng
            </h2>

            <div className="flex flex-col gap-4">
              {editor.questions.map((q, qIndex) => {
                const isOpen = editor.openedIds.has(q.tempId);
                return (
                  <Card key={q.tempId} className="p-5">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Câu {qIndex + 1}: {q.content}
                      </p>
                      <div className="w-32 shrink-0">
                        <Select
                          options={DIFFICULTY_OPTIONS}
                          value={q.difficulty}
                          onFocus={() => editor.openQuestion(q.tempId)}
                          onChange={(e) =>
                            editor.selectDifficulty(q.tempId, e.target.value as "easy" | "medium" | "hard")
                          }
                        />
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="flex flex-col gap-2 animate-fade-up">
                        {q.options.map((option, oIndex) => (
                          <label
                            key={oIndex}
                            className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                          >
                            <input
                              type="radio"
                              name={`correct-${q.tempId}`}
                              checked={q.correctIndex === oIndex}
                              onChange={() => editor.selectCorrect(q.tempId, oIndex)}
                              className="accent-primary w-4 h-4"
                            />
                            <span>
                              {String.fromCharCode(65 + oIndex)}. {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Chọn độ khó bên trên để thiết lập đáp án đúng cho câu này.
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>

            {editor.saveError && <p className="text-danger text-sm mt-4">{editor.saveError}</p>}

            <Button
              onClick={handleSave}
              disabled={editor.saving || !editor.allAnswered}
              loading={editor.saving}
              variant="success"
              size="lg"
              leftIcon={!editor.saving && <Save size={16} />}
              className="mt-6"
            >
              {editor.saving ? "Đang lưu..." : "Lưu bộ đề"}
            </Button>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}