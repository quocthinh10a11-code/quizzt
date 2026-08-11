"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePracticeSession, type PracticeQuestion } from "@/lib/usePracticeSession";
import LearningInsightCard from "@/components/ai/LearningInsightCard";

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = { easy: "success", medium: "warning", hard: "danger" };

export default function AdaptivePracticePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const rawQuestions = String(params.questions ?? "");
  const attemptId = Number(searchParams.get("attemptId"));
  const questionIds = [...new Set(rawQuestions.split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 10);

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [quizTitle] = useState("Adaptive · Luyện tập cá nhân hóa");

  const session = usePracticeSession({
    questions,
    userId: user?.id,
    quizId: null,
    quizTitle,
    // Database hiện tại chưa xác nhận support một enum/value "adaptive".
    // Giữ "quiz" để không phá schema hiện có và dùng quizTitle marker làm metadata nhận diện.
    attemptType: "quiz",
    storageKey: `quizResult:adaptive:${attemptId}:${questionIds.join("-")}`,
  });

  useEffect(() => {
    async function validateAndLoadQuestions() {
      setLoading(true);
      setValidationError("");
      setQuestions([]);

      if (!user || !Number.isInteger(attemptId) || attemptId <= 0 || questionIds.length === 0) {
        setValidationError("Phiên luyện tập không hợp lệ hoặc đã hết hiệu lực.");
        setLoading(false);
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          setValidationError("Bạn cần đăng nhập để sử dụng phiên luyện tập này.");
          setLoading(false);
          return;
        }

        const validationResponse = await fetch("/api/adaptive-practice/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ attemptId, questionIds }),
        });
        const validationData = await validationResponse.json();
        if (!validationResponse.ok || validationData.valid !== true) {
          setValidationError(validationData.error ?? "Phiên luyện tập không hợp lệ.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("questions")
          .select("id, content, options, correct_index, difficulty")
          .in("id", questionIds);
        if (error) {
          setValidationError("Không thể tải câu hỏi luyện tập.");
          setLoading(false);
          return;
        }

        const byId = new Map((data ?? []).map((question) => [question.id, question as PracticeQuestion]));
        const validatedQuestions = questionIds
          .map((id) => byId.get(id))
          .filter((question): question is PracticeQuestion => !!question);
        setQuestions(validatedQuestions);
      } catch {
        setValidationError("Không thể xác thực phiên luyện tập lúc này.");
      } finally {
        setLoading(false);
      }
    }

    validateAndLoadQuestions();
  }, [user?.id, rawQuestions, attemptId]);

  if (loading) return <div className="p-8 text-center text-gray-500">Đang xác thực và tải câu hỏi phù hợp...</div>;

  if (validationError || questions.length === 0) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Không thể mở phiên luyện tập</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 mb-5">{validationError || "Quizzt chưa tìm được câu hỏi hợp lệ cho phiên luyện tập này."}</p>
        <Button onClick={() => router.push("/")} variant="primary">Về trang chủ</Button>
      </div>
    );
  }

  if (!session.started) {
    return (
      <div className="p-8 max-w-md mx-auto text-center animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{quizTitle}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">Quizzt chọn {questions.length} câu từ test bank hiện có.</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Các câu được ưu tiên dựa trên lịch sử làm bài gần đây.</p>
        <Card className="p-6 text-left">
          <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={session.noLimit} onChange={(e) => session.setNoLimit(e.target.checked)} className="accent-primary w-4 h-4" />
            Không giới hạn thời gian
          </label>
          <div className={cn(session.noLimit && "opacity-40 pointer-events-none")}>
            <Input type="number" min={1} label="Thời gian làm bài (phút)" value={session.minutesInput} onChange={(e) => session.setMinutesInput(e.target.value.replace(/[^0-9]/g, ""))} disabled={session.noLimit} />
          </div>
        </Card>
        <Button onClick={session.handleStart} variant="primary" className="mt-6 w-full" size="lg">Bắt đầu luyện tập</Button>
      </div>
    );
  }

  const question = questions[session.currentIndex];
  const answeredCount = session.answers.filter((answer) => answer !== null).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto animate-fade-up">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <p className="text-sm font-medium text-primary">Luyện tập cá nhân hóa</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{quizTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Đã trả lời {answeredCount}/{questions.length} câu</p>
        </div>
        {session.timeLeft !== null && !session.submitted && (
          <Badge variant={session.timeLeft <= 30 ? "danger" : "default"} className="text-sm px-3 py-1.5"><Clock size={14} />{session.formatTime(session.timeLeft)}</Badge>
        )}
      </div>

      {!session.submitted ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-primary font-medium">Câu {session.currentIndex + 1} / {questions.length}</p>
            <Badge variant={DIFFICULTY_VARIANT[question.difficulty]}>{DIFFICULTY_LABEL[question.difficulty]}</Badge>
          </div>
          <p className="text-lg text-gray-900 dark:text-white mb-6">{question.content}</p>
          <div className="flex flex-col gap-3">
            {question.options.map((option, index) => {
              const isSelected = session.answers[session.currentIndex] === index;
              return (
                <button key={index} onClick={() => session.handleSelect(index)} className={cn("text-left px-4 py-3 rounded-lg border transition-all duration-150", "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20", isSelected ? "bg-primary text-white border-primary" : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 hover:border-primary/50")}>
                  <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>{option}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-8">
            <Button onClick={session.handlePrevious} disabled={session.currentIndex === 0} variant="secondary" leftIcon={<ChevronLeft size={16} />}>Trước</Button>
            {session.currentIndex === questions.length - 1 ? (
              <Button onClick={session.handleSubmit} variant="danger" rightIcon={<Send size={16} />}>Nộp bài</Button>
            ) : (
              <Button onClick={session.handleNext} variant="primary" rightIcon={<ChevronRight size={16} />}>Tiếp</Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-success mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kết quả</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">Đúng <span className="text-primary font-semibold">{questions.filter((q, i) => session.answers[i] === q.correct_index).length}</span>/{questions.length} câu</p>
            <Button onClick={() => router.push("/")} variant="primary" size="lg">Về trang chủ</Button>
          </Card>
          {session.attemptId !== null && <LearningInsightCard attemptId={session.attemptId} />}
        </>
      )}
    </div>
  );
}
