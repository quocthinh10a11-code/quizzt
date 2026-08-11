"use client";

import { useState } from "react";
import { StickyNote, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  questionId: number;
  initialContent: string;
  onSaved?: (content: string) => void;
};

export default function NoteEditor({ userId, questionId, initialContent, onSaved }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const hasNote = initialContent.trim().length > 0;

  async function handleSave() {
    setSaving(true);
    const trimmed = content.trim();

    if (trimmed.length === 0) {
      // Ghi chú rỗng -> xoá luôn dòng note thay vì lưu chuỗi rỗng
      await supabase.from("notes").delete().eq("user_id", userId).eq("question_id", questionId);
    } else {
      await supabase
        .from("notes")
        .upsert(
          { user_id: userId, question_id: questionId, content: trimmed },
          { onConflict: "user_id,question_id" }
        );
    }

    setSaving(false);
    setIsOpen(false);
    onSaved?.(trimmed);
  }

  function handleCancel() {
    setContent(initialContent);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Ghi chú"
        className={cn(
          "p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
          hasNote ? "text-primary hover:bg-primary/10" : "text-muted hover:text-primary hover:bg-primary/10"
        )}
      >
        <StickyNote size={18} fill={hasNote ? "currentColor" : "none"} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 z-10 rounded-lg border border-border bg-surface shadow-lg p-3 animate-fade-up">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ghi chú của riêng bạn cho câu hỏi này..."
            rows={4}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} leftIcon={<X size={14} />}>
              Huỷ
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave} loading={saving} leftIcon={!saving && <Check size={14} />}>
              Lưu
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}