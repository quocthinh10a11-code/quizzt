"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { extractTextFromFile } from "@/lib/fileParser";
import { parseText, extractTitleAndBody, type Difficulty } from "@/lib/quizParser";
import { syncQuizTags } from "@/lib/quizTags";

export type EditorQuestion = {
  id: number | null; // null = câu mới chưa lưu vào DB
  tempId: string;
  content: string;
  options: string[];
  correctIndex: number | null;
  difficulty: Difficulty;
};

function makeTempId() {
  return Math.random().toString(36).slice(2);
}

type Mode = "create" | "edit";

type UseQuizEditorParams = {
  mode: Mode;
  quizId?: number;
  userId: string | undefined;
};

type QuizSnapshot = {
  title: string;
  description: string;
  chapterId: number | null;
  tagNames: string[];
  questions: EditorQuestion[];
};

function questionsEqual(a: EditorQuestion, b: EditorQuestion) {
  return (
    a.content === b.content &&
    a.correctIndex === b.correctIndex &&
    a.difficulty === b.difficulty &&
    a.options.length === b.options.length &&
    a.options.every((option, index) => option === b.options[index])
  );
}

export function useQuizEditor({ mode, quizId, userId }: UseQuizEditorParams) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [tagNames, setTagNames] = useState<string[]>([]);

  const [questions, setQuestions] = useState<EditorQuestion[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState<QuizSnapshot | null>(null);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());

  const [rawText, setRawText] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileError, setFileError] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    setFileLoading(true);
    try {
      const text = await extractTextFromFile(file);
      setRawText(text);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Không đọc được file.");
    } finally {
      setFileLoading(false);
      e.target.value = "";
    }
  }

  function handleParse() {
    let body = rawText;
    if (mode === "create") {
      const { title: extractedTitle, body: extractedBody } = extractTitleAndBody(rawText);
      if (!title.trim() && extractedTitle) setTitle(extractedTitle);
      body = extractedBody;
    }

    const { questions: parsed, errors } = parseText(body);
    setParseErrors(errors);
    const nextQuestions = parsed.map((q) => ({
      id: null,
      tempId: makeTempId(),
      content: q.content,
      options: q.options,
      correctIndex: q.correctIndex,
      difficulty: q.difficulty,
    }));
    setQuestions(nextQuestions);
    setOpenedIds(new Set(nextQuestions.map((q) => q.tempId)));
  }

  function addQuestion() {
    const newQuestion = {
      id: null,
      tempId: makeTempId(),
      content: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      difficulty: "medium" as Difficulty,
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setOpenedIds((prev) => new Set(prev).add(newQuestion.tempId));
  }

  function updateQuestion(tempId: string, patch: Partial<EditorQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q)));
  }

  function updateOption(tempId: string, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const newOptions = [...q.options];
        newOptions[optIndex] = value;
        return { ...q, options: newOptions };
      })
    );
  }

  // Dùng ở trang Create: đổi độ khó tự động mở chi tiết câu hỏi
  function selectDifficulty(tempId: string, difficulty: Difficulty) {
    updateQuestion(tempId, { difficulty });
    setOpenedIds((prev) => new Set(prev).add(tempId));
  }

  function selectCorrect(tempId: string, optionIndex: number) {
    updateQuestion(tempId, { correctIndex: optionIndex });
  }

  function openQuestion(tempId: string) {
    setOpenedIds((prev) => new Set(prev).add(tempId));
  }

  function removeQuestion(tempId: string, id: number | null) {
    if (id !== null) setDeletedIds((prev) => [...prev, id]);
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  }

  function loadExisting(data: {
    title: string;
    description: string | null;
    subjectId: number | null;
    chapterId: number | null;
    tagNames: string[];
    questions: { id: number; content: string; options: string[]; correct_index: number; difficulty: Difficulty }[];
  }) {
    setTitle(data.title);
    setDescription(data.description ?? "");
    setSubjectId(data.subjectId);
    setChapterId(data.chapterId);
    setTagNames(data.tagNames);
    const loaded = data.questions.map((q) => ({
      id: q.id,
      tempId: makeTempId(),
      content: q.content,
      options: q.options,
      correctIndex: q.correct_index,
      difficulty: q.difficulty,
    }));
    setQuestions(loaded);
    setInitialSnapshot({
      title: data.title,
      description: data.description ?? "",
      chapterId: data.chapterId,
      tagNames: [...data.tagNames],
      questions: loaded.map((q) => ({ ...q, options: [...q.options] })),
    });
    setOpenedIds(new Set(loaded.map((q) => q.tempId)));
  }

  const allAnswered = questions.length > 0 && questions.every((q) => q.correctIndex !== null);

  function validate(): string | null {
    if (!title.trim()) return "Vui lòng nhập tên bộ đề.";
    if (title.trim().length > 200) return "Tên bộ đề không được vượt quá 200 ký tự.";
    if (questions.length === 0) return "Bộ đề cần có ít nhất 1 câu hỏi.";
    if (!allAnswered) return "Vui lòng chọn đáp án đúng cho tất cả câu hỏi.";
    for (const q of questions) {
      if (!q.content.trim() || q.options.some((o) => !o.trim())) {
        return "Mỗi câu hỏi cần đủ nội dung và 4 đáp án, không được để trống.";
      }
    }
    return null;
  }

  async function save(): Promise<{ success: boolean; quizId: number | null }> {
    setSaveError("");
    if (!userId) {
      setSaveError("Bạn cần đăng nhập để lưu bộ đề.");
      return { success: false, quizId: null };
    }
    const validationError = validate();
    if (validationError) {
      setSaveError(validationError);
      return { success: false, quizId: null };
    }

    setSaving(true);

    if (mode === "create") {
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          user_id: userId,
          is_public: isPublic,
          chapter_id: chapterId,
        })
        .select()
        .single();

      if (quizError || !quiz) {
        setSaveError(quizError?.message ?? "Không thể tạo bộ đề.");
        setSaving(false);
        return { success: false, quizId: null };
      }

      const rows = questions.map((q) => ({
        quiz_id: quiz.id,
        content: q.content,
        options: q.options,
        correct_index: q.correctIndex,
        difficulty: q.difficulty,
      }));

      const { error: questionsError } = await supabase.from("questions").insert(rows);

      if (questionsError) {
        await supabase.from("quizzes").delete().eq("id", quiz.id);
        setSaving(false);
        setSaveError("Không thể lưu câu hỏi, đã huỷ bộ đề vừa tạo: " + questionsError.message);
        return { success: false, quizId: null };
      }

      const { error: tagsError } = await syncQuizTags(quiz.id, userId, tagNames);
      setSaving(false);
      if (tagsError) {
        setSaveError(tagsError);
        return { success: false, quizId: quiz.id };
      }
      return { success: true, quizId: quiz.id };
    }

    // mode === "edit"
    if (!quizId) {
      setSaveError("Thiếu ID bộ đề.");
      setSaving(false);
      return { success: false, quizId: null };
    }

    const snapshot = initialSnapshot;
    const titleChanged = !snapshot || title.trim() !== snapshot.title;
    const descriptionChanged = !snapshot || (description.trim() || "") !== snapshot.description;
    const chapterChanged = !snapshot || chapterId !== snapshot.chapterId;

    if (titleChanged || descriptionChanged || chapterChanged) {
      const { error: titleError } = await supabase
        .from("quizzes")
        .update({
          ...(titleChanged ? { title: title.trim() } : {}),
          ...(descriptionChanged ? { description: description.trim() || null } : {}),
          ...(chapterChanged ? { chapter_id: chapterId } : {}),
        })
        .eq("id", quizId);

      if (titleError) {
        setSaveError("Lỗi khi lưu thông tin bộ đề: " + titleError.message);
        setSaving(false);
        return { success: false, quizId };
      }
    }

    if (deletedIds.length > 0) {
      const { error: deleteError } = await supabase.from("questions").delete().in("id", deletedIds);
      if (deleteError) {
        setSaveError("Lỗi khi xoá câu hỏi: " + deleteError.message);
        setSaving(false);
        return { success: false, quizId };
      }
    }

    const initialQuestionsById = new Map(
      (snapshot?.questions ?? []).filter((q) => q.id !== null).map((q) => [q.id as number, q])
    );
    const changedExisting = questions.filter((q) => {
      if (q.id === null || deletedIds.includes(q.id)) return false;
      const original = initialQuestionsById.get(q.id);
      return !original || !questionsEqual(q, original);
    });

    for (const q of changedExisting) {
      const { error } = await supabase
        .from("questions")
        .update({ content: q.content, options: q.options, correct_index: q.correctIndex, difficulty: q.difficulty })
        .eq("id", q.id);
      if (error) {
        setSaveError(`Lỗi khi lưu câu "${q.content.slice(0, 20)}...": ${error.message}`);
        setSaving(false);
        return { success: false, quizId };
      }
    }

    const newOnes = questions.filter((q) => q.id === null);
    if (newOnes.length > 0) {
      const { error } = await supabase.from("questions").insert(
        newOnes.map((q) => ({
          quiz_id: quizId,
          content: q.content,
          options: q.options,
          correct_index: q.correctIndex,
          difficulty: q.difficulty,
        }))
      );
      if (error) {
        setSaveError("Lỗi khi thêm câu hỏi mới: " + error.message);
        setSaving(false);
        return { success: false, quizId };
      }
    }

    const tagsChanged = !snapshot ||
      tagNames.length !== snapshot.tagNames.length ||
      tagNames.some((tag, index) => tag !== snapshot.tagNames[index]);

    if (tagsChanged) {
      const { error: tagsError } = await syncQuizTags(quizId, userId, tagNames);
      if (tagsError) {
        setSaveError("Lỗi khi lưu nhãn: " + tagsError);
        setSaving(false);
        return { success: false, quizId };
      }
    }

    setSaving(false);
    setDeletedIds([]);
    return { success: true, quizId };
  }

  return {
    title, setTitle,
    description, setDescription,
    isPublic, setIsPublic,
    subjectId, setSubjectId,
    chapterId, setChapterId,
    tagNames, setTagNames,
    questions,
    openedIds,
    rawText, setRawText,
    parseErrors,
    fileError, fileLoading,
    saving, saveError,
    allAnswered,
    handleFileUpload,
    handleParse,
    addQuestion,
    updateQuestion,
    updateOption,
    selectCorrect,
    selectDifficulty,
    openQuestion,
    removeQuestion,
    loadExisting,
    save,
  };
}
