"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, X, ListPlus, CheckCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import NoteEditor from "@/components/NoteEditor";
import { cn } from "@/lib/utils";
import { addToReviewQueue, getQuestionIdsInQueue } from "@/lib/reviewQueue";
import AiTutorChat from "@/components/ai/AiTutorChat";
import { buildQuickActions } from "@/lib/ai/quickActions";
type StoredQuestion = {
  id: number;
  content: string;
  options: string[];
  correct_index: number;
};

type StoredResult = {
  questions: StoredQuestion[];
  answers: (number | null)[];
};

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);
  const { user } = useAuth();

  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [reviewQueueIds, setReviewQueueIds] = useState<Set<number>>(new Set());
  // Câu hỏi đang được chọn để hỏi AI. null = chưa mở chat cho câu nào.
  // Chỉ 1 AiTutorChat được mount tại 1 thời điểm (xem giải thích trong Impact Analysis).
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(`quizResult:${quizId}`);
    if (raw) {
      const parsed: StoredResult = JSON.parse(raw);
      setResult(parsed);

      if (user) {
        const questionIds = parsed.questions.map((q) => q.id);

        supabase
          .from("notes")
          .select("question_id, content")
          .eq("user_id", user.id)
          .in("question_id", questionIds)
          .then(({ data }) => {
            const notesMap: Record<number, string> = {};
            (data ?? []).forEach((n) => {
              notesMap[n.question_id] = n.content;
            });
            setNotes(notesMap);
          });

        getQuestionIdsInQueue(user.id, questionIds).then(setReviewQueueIds);
      }
    }
    setLoaded(true);
  }, [quizId, user?.id]);

  async function handleAddToReview(questionId: number, source: "wrong_answer" | "note") {
    if (!user || reviewQueueIds.has(questionId)) return;

    setReviewQueueIds((prev) => new Set(prev).add(questionId));
    const { error } = await addToReviewQueue(user.id, questionId, source);
    if (error) {
      setReviewQueueIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  }

  if (!loaded) return null;

  if (!result) {
    return (
      <div className="p-8 text-center animate-fade-up">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Bạn chưa làm bộ đề này. Hãy bấm &quot;Làm bài&quot; trước.
        </p>
        <Button onClick={() => router.push(`/practice/${quizId}`)} variant="primary">
          Làm bài ngay
        </Button>
      </div>
    );
  }

  const correctCount = result.questions.filter(
    (q, i) => result.answers[i] === q.correct_index
  ).length;

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-up">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Xem lại đáp án</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Đúng{" "}
        <span className="text-primary font-semibold">{correctCount}</span>/
        {result.questions.length} câu
      </p>

      <div className="flex flex-col gap-4">
        {result.questions.map((question, i) => {
          const selected = result.answers[i];
          const isCorrect = selected === question.correct_index;

          return (
            <Card
              key={question.id}
              className={cn(
                "p-5 border-l-4",
                isCorrect ? "border-l-success" : "border-l-danger"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <Check size={18} className="text-success shrink-0 mt-0.5" />
                  ) : (
                    <X size={18} className="text-danger shrink-0 mt-0.5" />
                  )}
                  <p className="font-medium text-gray-900 dark:text-white">
                    Câu {i + 1}. {question.content}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {user && !isCorrect && (
                    reviewQueueIds.has(question.id) ? (
                      <span title="Đã có trong danh sách ôn tập" className="p-1.5 text-success">
                        <CheckCircle size={18} />
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddToReview(question.id, "wrong_answer")}
                        title="Thêm vào ôn tập"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                      >
                        <ListPlus size={18} />
                      </button>
                    )
                  )}
                  {user && (
                    <NoteEditor
                      userId={user.id}
                      questionId={question.id}
                      initialContent={notes[question.id] ?? ""}
                      onSaved={(content) => {
                        setNotes((prev) => ({ ...prev, [question.id]: content }));
                        if (content.trim()) {
                          handleAddToReview(question.id, "note");
                        }
                      }}
                    />
                  )}
                  <button
                    onClick={() => setActiveQuestionId(question.id)}
                    title="Hỏi AI về câu này"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    <MessageCircle size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pl-6">
                {question.options.map((option, optIndex) => {
                  const isSelected = optIndex === selected;
                  const isTheCorrectOne = optIndex === question.correct_index;

                  return (
                    <div
                      key={optIndex}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm",
                        isTheCorrectOne &&
                          "border-success bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300",
                        isSelected &&
                          !isCorrect &&
                          "border-danger bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300",
                        !isTheCorrectOne &&
                          !(isSelected && !isCorrect) &&
                          "border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {String.fromCharCode(65 + optIndex)}. {option}
                      {isTheCorrectOne && " ✓"}
                      {isSelected && !isCorrect && " (bạn chọn)"}
                    </div>
                  );
                })}
                {selected === null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Bạn chưa chọn đáp án cho câu này.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Button onClick={() => router.push(`/practice/${quizId}`)} variant="secondary">
          Làm lại bộ đề
        </Button>
      </div>

      {activeQuestionId !== null && (() => {
        const activeQuestion = result.questions.find((q) => q.id === activeQuestionId);
        if (!activeQuestion) return null;
        const activeIndex = result.questions.findIndex((q) => q.id === activeQuestionId);
        const wasCorrect = result.answers[activeIndex] === activeQuestion.correct_index;
        return (
          <AiTutorChat
            key={activeQuestionId}
            questionContext={{
              content: activeQuestion.content,
              options: activeQuestion.options,
              correctIndex: activeQuestion.correct_index,
            }}
            resetKey={activeQuestion.id}
            submitted={true}
            screenContext="review"
            autoOpen={true}
            quickActions={buildQuickActions({ screenContext: "review", submitted: true, wasCorrect })}
          />
        );
      })()}
    </div>
  );
}