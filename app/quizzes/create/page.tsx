"use client";

import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import { useQuizEditor } from "@/lib/useQuizEditor";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuizMetadataForm from "@/components/quiz-editor/QuizMetadataForm";
import QuestionCard from "@/components/quiz-editor/QuestionCard";
import ImportPanel from "@/components/quiz-editor/ImportPanel";

export default function CreateQuizPage() {
  const router = useRouter();
  const { user } = useAuth();
  const editor = useQuizEditor({ mode: "create", userId: user?.id });

  async function handleSave() {
    const result = await editor.save();
    if (result.success) {
      router.push("/quizzes");
    }
  }

  if (!user) return null;

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tạo bộ đề mới</h1>

        <Card className="p-6">
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

          <div className="mt-6">
            <ImportPanel
              rawText={editor.rawText}
              onChangeRawText={editor.setRawText}
              onFileUpload={editor.handleFileUpload}
              onParse={editor.handleParse}
              fileLoading={editor.fileLoading}
              fileError={editor.fileError}
              parseErrors={editor.parseErrors}
            />
          </div>
        </Card>

        {editor.questions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Xem trước ({editor.questions.length} câu) — chọn đáp án đúng
            </h2>

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