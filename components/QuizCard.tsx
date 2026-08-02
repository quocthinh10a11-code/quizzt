"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, Plus, Pencil, Globe, Lock, User, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { cloneQuiz } from "@/lib/cloneQuiz";
import { deleteQuiz } from "@/lib/deleteQuiz";
import { useToast } from "@/components/ui/Toast";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type QuizCardProps = {
  id: number;
  title: string;
  description: string | null;
  updatedAt: string;
  ownerUsername: string | null;
  questions: number;
  ownerId: string | null;
  isPublic: boolean;
  onDeleted?: (id: number) => void;
};

export default function QuizCard({
  id,
  title,
  description,
  updatedAt,
  ownerUsername,
  questions,
  ownerId,
  isPublic,
  onDeleted,
}: QuizCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const isOwner = !!user && user.id === ownerId;

  const [publicState, setPublicState] = useState(isPublic);
  const [toggling, setToggling] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleTogglePublic() {
    if (toggling) return;

    const next = !publicState;
    setPublicState(next);
    setToggling(true);

    const { error } = await supabase
      .from("quizzes")
      .update({ is_public: next })
      .eq("id", id);

    if (error) {
      setPublicState(!next);
      alert("Không thể đổi trạng thái: " + error.message);
    }

    setToggling(false);
  }

  async function handleClone() {
    if (!user || cloning) return;
    setCloning(true);

    const { newQuizId, error } = await cloneQuiz(id, user.id);

    setCloning(false);

    if (error || !newQuizId) {
      showToast(error ?? "Không thể nhân bản bộ đề.", "error");
      return;
    }

    showToast("Đã nhân bản bộ đề! Bạn có thể chỉnh sửa ngay.", "success");
    router.push(`/quizzes/${newQuizId}/edit`);
  }

  async function handleDelete() {
    if (deleting) return;

    const confirmed = window.confirm(
      `Xoá bộ đề "${title}" sẽ xoá toàn bộ ${questions} câu hỏi bên trong. Hành động này không thể hoàn tác. Tiếp tục?`
    );
    if (!confirmed) return;

    setDeleting(true);

    const { error } = await deleteQuiz(id);

    setDeleting(false);

    if (error) {
      showToast(error, "error");
      return;
    }

    showToast("Đã xoá bộ đề.", "success");
    onDeleted?.(id);
  }

  const formattedDate = new Date(updatedAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

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

      {description && (
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {description}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <span>{questions} câu hỏi</span>
        <span>·</span>
        <span>Cập nhật {formattedDate}</span>
        {!isOwner && ownerUsername && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <User size={11} />
              {ownerUsername}
            </span>
          </>
        )}
      </div>

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

        {!isOwner && isPublic && user && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Copy size={14} />}
            loading={cloning}
            onClick={handleClone}
          >
            Nhân bản
          </Button>
        )}

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
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:bg-red-50 dark:hover:bg-red-950/30"
              leftIcon={<Trash2 size={14} />}
              loading={deleting}
              onClick={handleDelete}
            >
              Xoá
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}