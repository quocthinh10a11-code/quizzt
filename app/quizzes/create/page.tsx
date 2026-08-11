"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2, Save, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import { useQuizEditor } from "@/lib/useQuizEditor";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import QuizMetadataForm from "@/components/quiz-editor/QuizMetadataForm";
import QuestionCard from "@/components/quiz-editor/QuestionCard";
import ImportPanel from "@/components/quiz-editor/ImportPanel";

export default function CreateQuizPage() {
  const router = useRouter();
  const { user } = useAuth();
  const editor = useQuizEditor({ mode: "create", userId: user?.id });

  async function handleSave() {
    const result = await editor.save();
    if (result.success) router.push("/quizzes");
  }

  if (!user) return null;

  return (
    <RequireAuth>
      <main className="min-h-[calc(100vh-68px)] bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-10 animate-fade-up">
          <button
            onClick={() => router.push("/quizzes")}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-lg px-2 py-1.5"
          >
            <ArrowLeft size={16} />
            Quay lại thư viện
          </button>

          <header className="mt-6 mb-7">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="default">
                <FilePlus2 size={13} />
                Tạo bộ đề
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Tạo bộ đề mới
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted leading-6 max-w-2xl">
              Thêm thông tin bộ đề, nhập câu hỏi rồi kiểm tra đáp án trước khi lưu.
            </p>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
            <div className="space-y-6">
              <Card className="p-5 sm:p-7">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-foreground">Thông tin bộ đề</h2>
                  <p className="mt-1 text-xs text-muted">Những thông tin này giúp bạn dễ tìm và quản lý bộ đề sau này.</p>
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
                  isPublic={editor.isPublic}
                  onChangePublic={editor.setIsPublic}
                  showPublicToggle
                />
              </Card>

              <Card className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Nhập câu hỏi</h2>
                    <p className="mt-1 text-xs text-muted">Bạn có thể upload file hoặc dán nội dung theo định dạng Quizzt.</p>
                  </div>
                  <Badge variant="default">Bước 2</Badge>
                </div>
                <ImportPanel
                  rawText={editor.rawText}
                  onChangeRawText={editor.setRawText}
                  onFileUpload={editor.handleFileUpload}
                  onParse={editor.handleParse}
                  fileLoading={editor.fileLoading}
                  fileError={editor.fileError}
                  parseErrors={editor.parseErrors}
                />
              </Card>
            </div>

            <Card className="p-5 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={17} />
                <span className="text-sm font-semibold">Mẹo nhanh</span>
              </div>
              <ul className="mt-4 space-y-3 text-xs leading-5 text-muted">
                <li><strong className="text-foreground">1.</strong> Đặt tên ngắn, dễ nhận biết.</li>
                <li><strong className="text-foreground">2.</strong> Chọn môn và chương để dễ tìm lại.</li>
                <li><strong className="text-foreground">3.</strong> Sau khi tách câu, kiểm tra đáp án đúng.</li>
                <li><strong className="text-foreground">4.</strong> Chỉ công khai khi bạn muốn chia sẻ bộ đề.</li>
              </ul>
            </Card>
          </div>

          {editor.questions.length > 0 && (
            <section className="mt-8">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Kiểm tra câu hỏi</h2>
                  <p className="mt-1 text-sm text-muted">Chọn đáp án đúng và độ khó cho từng câu trước khi lưu.</p>
                </div>
                <Badge variant={editor.allAnswered ? "success" : "warning"}>
                  {editor.questions.length} câu · {editor.allAnswered ? "Đã hoàn tất" : "Cần kiểm tra"}
                </Badge>
              </div>

              <div className="flex flex-col gap-4">
                {editor.questions.map((q, index) => (
                  <QuestionCard
                    key={q.tempId}
                    question={q}
                    index={index}
                    variant="preview"
                    isOpen={editor.openedIds.has(q.tempId)}
                    onOpen={() => editor.openQuestion(q.tempId)}
                    onChangeDifficulty={(d) => editor.selectDifficulty(q.tempId, d)}
                    onSelectCorrect={(i) => editor.selectCorrect(q.tempId, i)}
                  />
                ))}
              </div>

              {editor.saveError && (
                <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
                  {editor.saveError}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleSave}
                  disabled={editor.saving || !editor.allAnswered}
                  loading={editor.saving}
                  variant="primary"
                  size="lg"
                  leftIcon={!editor.saving && <Save size={16} />}
                >
                  {editor.saving ? "Đang lưu..." : "Lưu bộ đề"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>
    </RequireAuth>
  );
}