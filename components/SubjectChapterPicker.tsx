"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Subject = { id: number; name: string };
type Chapter = { id: number; name: string; subject_id: number };

type Props = {
  userId: string;
  subjectId: number | null;
  chapterId: number | null;
  onChange: (value: { subjectId: number | null; chapterId: number | null }) => void;
};

const NEW_VALUE = "__new__";
const NONE_VALUE = "__none__";

export default function SubjectChapterPicker({ userId, subjectId, chapterId, onChange }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSubjects() {
      const { data } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("user_id", userId)
        .order("name");
      setSubjects(data ?? []);
    }
    loadSubjects();
  }, [userId]);

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      return;
    }
    async function loadChapters() {
      const { data } = await supabase
        .from("chapters")
        .select("id, name, subject_id")
        .eq("subject_id", subjectId)
        .order("name");
      setChapters(data ?? []);
    }
    loadChapters();
  }, [subjectId]);

  async function handleSaveNewSubject() {
    const name = newSubjectName.trim();
    if (!name) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("subjects")
      .insert({ user_id: userId, name })
      .select()
      .single();
    setSaving(false);

    if (!error && data) {
      setSubjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubjectName("");
      setCreatingSubject(false);
      onChange({ subjectId: data.id, chapterId: null });
    }
  }

  async function handleSaveNewChapter() {
    const name = newChapterName.trim();
    if (!name || !subjectId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("chapters")
      .insert({ subject_id: subjectId, name })
      .select()
      .single();
    setSaving(false);

    if (!error && data) {
      setChapters((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewChapterName("");
      setCreatingChapter(false);
      onChange({ subjectId, chapterId: data.id });
    }
  }

  function handleSubjectSelect(value: string) {
    if (value === NEW_VALUE) {
      setCreatingSubject(true);
      return;
    }
    if (value === NONE_VALUE) {
      onChange({ subjectId: null, chapterId: null });
      return;
    }
    onChange({ subjectId: Number(value), chapterId: null });
  }

  function handleChapterSelect(value: string) {
    if (value === NEW_VALUE) {
      setCreatingChapter(true);
      return;
    }
    if (value === NONE_VALUE) {
      onChange({ subjectId, chapterId: null });
      return;
    }
    onChange({ subjectId, chapterId: Number(value) });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Select
          label="Môn học (tuỳ chọn)"
          value={subjectId ? String(subjectId) : NONE_VALUE}
          onChange={(e) => handleSubjectSelect(e.target.value)}
          options={[
            { value: NONE_VALUE, label: "Không chọn" },
            ...subjects.map((s) => ({ value: String(s.id), label: s.name })),
            { value: NEW_VALUE, label: "+ Thêm môn học mới" },
          ]}
        />
        {creatingSubject && (
          <div className="flex items-center gap-2 mt-2 animate-fade-up">
            <Input
              placeholder="Tên môn học mới"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleSaveNewSubject} loading={saving} leftIcon={!saving && <Plus size={14} />}>
              Lưu
            </Button>
          </div>
        )}
      </div>

      <div>
        <Select
          label="Chương (tuỳ chọn)"
          value={chapterId ? String(chapterId) : NONE_VALUE}
          onChange={(e) => handleChapterSelect(e.target.value)}
          disabled={!subjectId}
          options={[
            { value: NONE_VALUE, label: "Không chọn" },
            ...chapters.map((c) => ({ value: String(c.id), label: c.name })),
            { value: NEW_VALUE, label: "+ Thêm chương mới" },
          ]}
        />
        {creatingChapter && (
          <div className="flex items-center gap-2 mt-2 animate-fade-up">
            <Input
              placeholder="Tên chương mới"
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleSaveNewChapter} loading={saving} leftIcon={!saving && <Plus size={14} />}>
              Lưu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}