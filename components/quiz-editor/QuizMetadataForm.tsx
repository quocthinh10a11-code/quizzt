"use client";

import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import SubjectChapterPicker from "@/components/SubjectChapterPicker";
import TagPicker from "@/components/TagPicker";

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
    <>
      <Input
        placeholder="Tên bộ đề"
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        className="mb-4"
      />
      <Textarea
        placeholder="Mô tả ngắn về bộ đề (tuỳ chọn)"
        value={description}
        onChange={(e) => onChangeDescription(e.target.value)}
        rows={2}
        className="mb-4"
      />

      <SubjectChapterPicker
        userId={userId}
        subjectId={subjectId}
        chapterId={chapterId}
        onChange={onChangeSubjectChapter}
      />

      <div className="mt-4">
        <TagPicker userId={userId} selectedNames={tagNames} onChange={onChangeTags} />
      </div>

      {showPublicToggle && (
        <label className="flex items-center gap-2 mt-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => onChangePublic?.(e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          Công khai bộ đề này (người khác có thể tìm và làm bài)
        </label>
      )}
    </>
  );
}