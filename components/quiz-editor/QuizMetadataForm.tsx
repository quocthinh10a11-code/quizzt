"use client";

import { BookOpen, Globe2, Lock, Tag } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import SubjectChapterPicker from "@/components/SubjectChapterPicker";
import TagPicker from "@/components/TagPicker";
import Card from "@/components/ui/Card";

 type Props = {
  userId: string;
  title: string;
  onChangeTitle: (value: string) => void;
  description: string;
  onChangeDescription: (value: string) => void;
  subjectId: number | null;
  chapterId: number | null;
  onChangeSubjectChapter: (value: { subjectId: number | null; chapterId: number | null }) => void;
  tagNames: string[];
  onChangeTags: (names: string[]) => void;
  isPublic?: boolean;
  onChangePublic?: (value: boolean) => void;
  showPublicToggle?: boolean;
};

export default function QuizMetadataForm({
  userId,
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  subjectId,
  chapterId,
  onChangeSubjectChapter,
  tagNames,
  onChangeTags,
  isPublic,
  onChangePublic,
  showPublicToggle = false,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <Input
          label="Tên bộ đề"
          placeholder="Ví dụ: Toán 12 — Ôn tập học kỳ I"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          helperText="Chọn tên ngắn gọn để dễ tìm lại sau này."
        />
      </div>

      <Textarea
        label="Mô tả"
        placeholder="Bộ đề này giúp bạn ôn tập nội dung nào?"
        value={description}
        onChange={(e) => onChangeDescription(e.target.value)}
        rows={3}
      />

      <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Phân loại</p>
            <p className="text-xs text-muted">Giúp Quizzt tổ chức bộ đề theo môn và chương.</p>
          </div>
        </div>
        <SubjectChapterPicker
          userId={userId}
          subjectId={subjectId}
          chapterId={chapterId}
          onChange={onChangeSubjectChapter}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={16} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Nhãn</p>
            <p className="text-xs text-muted">Thêm từ khóa để lọc và nhận diện chủ đề nhanh hơn.</p>
          </div>
        </div>
        <TagPicker userId={userId} selectedNames={tagNames} onChange={onChangeTags} />
      </div>

      {showPublicToggle && (
        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 cursor-pointer hover:border-primary/40 transition-colors">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => onChangePublic?.(e.target.checked)}
            className="mt-0.5 accent-primary w-4 h-4"
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {isPublic ? <Globe2 size={15} className="text-success" /> : <Lock size={15} className="text-muted" />}
              {isPublic ? "Công khai bộ đề" : "Bộ đề riêng tư"}
            </span>
            <span className="block mt-1 text-xs leading-5 text-muted">
              {isPublic
                ? "Người khác có thể tìm thấy và làm bộ đề này."
                : "Chỉ bạn có thể truy cập bộ đề này."}
            </span>
          </span>
        </label>
      )}
    </div>
  );
}