"use client";

import { Trash2 } from "lucide-react";
import type { EditorQuestion } from "@/lib/useQuizEditor";
import type { Difficulty } from "@/lib/quizParser";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Trung bình" },
  { value: "hard", label: "Khó" },
];

type Props = {
  question: EditorQuestion;
  index: number;
  isOpen: boolean;
  onOpen: () => void;
  onChangeDifficulty: (difficulty: Difficulty) => void;
  onSelectCorrect: (optionIndex: number) => void;
  // variant "preview": nội dung tĩnh (Create — nội dung đến từ parser, không sửa tay)
  // variant "full": nội dung + đáp án đều sửa được (Edit)
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
  return (
    <Card className="p-5">
      <div className="flex justify-between items-start gap-3 mb-3">
        {variant === "preview" ? (
          <p className="font-medium text-gray-900 dark:text-white">
            Câu {index + 1}: {question.content}
          </p>
        ) : (
          <span className="font-semibold text-gray-900 dark:text-white shrink-0">Câu {index + 1}</span>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-32">
            <Select
              options={DIFFICULTY_OPTIONS}
              value={question.difficulty}
              onFocus={onOpen}
              onChange={(e) => onChangeDifficulty(e.target.value as Difficulty)}
            />
          </div>
          {variant === "full" && onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 text-danger text-sm hover:underline"
            >
              <Trash2 size={14} />
              Xoá
            </button>
          )}
        </div>
      </div>

      {!isOpen ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          Chọn độ khó bên trên để thiết lập {variant === "full" ? "nội dung và " : ""}đáp án đúng cho câu này.
        </p>
      ) : variant === "preview" ? (
        <div className="flex flex-col gap-2 animate-fade-up">
          {question.options.map((option, oIndex) => (
            <label
              key={oIndex}
              className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
            >
              <input
                type="radio"
                name={`correct-${question.tempId}`}
                checked={question.correctIndex === oIndex}
                onChange={() => onSelectCorrect(oIndex)}
                className="accent-primary w-4 h-4"
              />
              <span>
                {String.fromCharCode(65 + oIndex)}. {option}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="animate-fade-up">
          <Textarea
            value={question.content}
            onChange={(e) => onChangeContent?.(e.target.value)}
            placeholder="Nội dung câu hỏi"
            rows={2}
            className="mb-3"
          />
          <div className="flex flex-col gap-2">
            {question.options.map((opt, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.tempId}`}
                  checked={question.correctIndex === optIndex}
                  onChange={() => onSelectCorrect(optIndex)}
                  className="accent-primary w-4 h-4 shrink-0"
                />
                <span className="w-5 text-sm text-gray-500 dark:text-gray-400">
                  {String.fromCharCode(65 + optIndex)}.
                </span>
                <Input
                  value={opt}
                  onChange={(e) => onChangeOption?.(optIndex, e.target.value)}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Chọn nút tròn ở đầu dòng để đánh dấu đáp án đúng.
          </p>
        </div>
      )}
    </Card>
  );
}