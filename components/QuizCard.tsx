"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, RotateCcw, Plus, Pencil, Globe, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type QuizCardProps = {
  id: number;
  title: string;
  questions: number;
  ownerId: string | null;
  isPublic: boolean;
};

export default function QuizCard({ id, title, questions, ownerId, isPublic }: QuizCardProps) {
  const { user } = useAuth();
  const isOwner = !!user && user.id === ownerId;

  const [publicState, setPublicState] = useState(isPublic);
  const [toggling, setToggling] = useState(false);

  async function handleTogglePublic() {
    if (toggling) return;

    const next = !publicState;
    setPublicState(next); // optimistic UI
    setToggling(true);

    const { error } = await supabase
      .from("quizzes")
      .update({ is_public: next })
      .eq("id", id);

    if (error) {
      setPublicState(!next); // rollback nếu lỗi
      alert("Không thể đổi trạng thái: " + error.message);
    }

    setToggling(false);
  }

  return (
    <Card hoverable className="p-6 flex flex-col animate-fade-up">
      <div className="flex justify-between items-start gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
          {title}
        </h2>

        {isOwner && (
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            title={publicState ? "Đang công khai — bấm để chuyển sang riêng tư" : "Đang riêng tư — bấm để công khai"}
            className="shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-full"
          >
            <Badge variant={publicState ? "success" : "default"}>
              {publicState ? <Globe size={12} /> : <Lock size={12} />}
              {publicState ? "Công khai" : "Riêng tư"}
            </Badge>
          </button>
        )}
      </div>

      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
        {questions} câu hỏi
      </p>

      <div className="mt-5 flex gap-2 flex-wrap">
        <Link href={`/practice/${id}`}>
          <Button size="sm" variant="primary" leftIcon={<Play size={14} />}>
            Làm bài
          </Button>
        </Link>

        <Link href={`/review/${id}`}>
          <Button size="sm" variant="secondary" leftIcon={<RotateCcw size={14} />}>
            Ôn tập
          </Button>
        </Link>

        {isOwner && (
          <>
            <Link href={`/quizzes/${id}/add-questions`}>
              <Button size="sm" variant="outline" leftIcon={<Plus size={14} />}>
                Thêm câu
              </Button>
            </Link>
            <Link href={`/quizzes/${id}/edit`}>
              <Button size="sm" variant="ghost" leftIcon={<Pencil size={14} />}>
                Sửa
              </Button>
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}