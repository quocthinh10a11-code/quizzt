"use client";

import { Check, ChevronDown, Trash2 } from "lucide-react";
import type { EditorQuestion } from "@/lib/useQuizEditor";
import type { Difficulty } from "@/lib/quizParser";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
];

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

type Props = {
  question: EditorQuestion;
  index: number;
  isOpen: boolean;
  onOpen: () => void;
  onChangeDifficulty: (difficulty: Difficulty) => void;
  onSelectCorrect: (optionIndex: number) => void;
  variant: "preview" | "full";
  onChangeContent?: (content: string) => void;
  onChangeOption?: (optionIndex: number, value: string) => void;
  onDelete?: () => void;
};

export default function QuestionCard({
  question,
  index,
  isOpen,
  onOpen,
  onChangeDifficulty,
  onSelectCorrect,
  variant,
  onChangeContent,
  onChangeOption,
  onDelete,
}: Props) {
  const hasCorrectAnswer = question.correctIndex !== null;

  return (
    <Card className={cn("overflow-hidden", isOpen && "ring-1 ring-primary/10")}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-lg"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">Câu {index + 1}</span>
              <Badge variant={hasCorrectAnswer ? "success" : "warning"}>
                {hasCorrectAnswer ? <Check size={12} /> : "Cần chọn đáp án"}
                {hasCorrectAnswer && "Đã chọn"}
              </Badge>
            </div>
            {variant === "preview" ? (
              <p className="mt-2 text-sm sm:text-base font-medium leading-6 text-foreground line-clamp-2">
                {question.content || "Chưa có nội dung câu hỏi"}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">Bấm để mở rộng và chỉnh sửa câu hỏi.</p>
            )}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-32 sm:w-36" onClick={(e) => e.stopPropagation()}>
              <Select
                label="Độ khó"
                options={DIFFICULTY_OPTIONS}
                value={question.difficulty}
                onFocus={onOpen}
                onChange={(e) => onChangeDifficulty(e.target.value as Difficulty)}
                className="text-xs"
              />
            </div>
            {variant === "full" && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                title="Xoá câu hỏi"
                className="p-2 mt-5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/20"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={onOpen}
              aria-label={isOpen ? "Thu gọn câu hỏi" : "Mở câu hỏi"}
              className="p-2 mt-5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              <ChevronDown size={17} className={cn("transition-transform", isOpen && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>

      {!isOpen ? (
        <div className="px-4 sm:px-5 pb-4">
          <div className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
            Mở câu hỏi để kiểm tra hoặc chỉnh đáp án.
          </div>
        </div>
      ) : variant === "preview" ? (
        <div className="border-t border-border bg-surface-muted/40 p-4 sm:p-5 animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Chọn đáp án đúng</p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {question.options.map((option, oIndex) => {
              const selected = question.correctIndex === oIndex;
              return (
                <label
                  key={oIndex}
                  className={cn(
                    "flex items-start gap-3 cursor-pointer rounded-xl border px-3.5 py-3 text-sm transition-colors",
                    selected
                      ? "border-success/30 bg-success-soft text-foreground"
                      : "border-border bg-surface hover:border-primary/40 hover:bg-primary-soft/30"
                  )}
                >
                  <input
                    type="radio"
                    name={`correct-${question.tempId}`}
                    checked={selected}
                    onChange={() => onSelectCorrect(oIndex)}
                    className="accent-primary mt-0.5 w-4 h-4 shrink-0"
                  />
                  <span className="font-medium">{String.fromCharCode(65 + oIndex)}.</span>
                  <span className="leading-5">{option}</span>
                  {selected && <Check size={16} className="ml-auto text-success shrink-0" />}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border-t border-border p-4 sm:p-5 animate-fade-up">
          <Textarea
            label="Nội dung câu hỏi"
            value={question.content}
            onChange={(e) => onChangeContent?.(e.target.value)}
            placeholder="Nhập nội dung câu hỏi..."
            rows={3}
            className="mb-4"
          />
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Các đáp án</p>
            <div className="flex flex-col gap-2.5">
              {question.options.map((opt, optIndex) => {
                const selected = question.correctIndex === optIndex;
                return (
                  <div key={optIndex} className={cn("flex items-center gap-2 rounded-xl p-2 border", selected ? "border-success/30 bg-success-soft/40" : "border-border bg-surface")}>
                    <input
                      type="radio"
                      name={`correct-${question.tempId}`}
                      checked={selected}
                      onChange={() => onSelectCorrect(optIndex)}
                      title="Đánh dấu đáp án đúng"
                      className="accent-primary w-4 h-4 shrink-0 ml-1"
                    />
                    <span className="w-5 text-sm font-semibold text-muted">{String.fromCharCode(65 + optIndex)}.</span>
                    <Input
                      aria-label={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                      value={opt}
                      onChange={(e) => onChangeOption?.(optIndex, e.target.value)}
                      placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                      className="flex-1 border-0 shadow-none bg-transparent focus:ring-0 px-2"
                    />
                    {selected && <Badge variant="success">Đúng</Badge>}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-3">Chọn nút tròn bên trái để đánh dấu đáp án đúng.</p>
          </div>
        </div>
      )}
    </Card>
  );
}