"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

type Subject = { id: number; name: string };
type Chapter = { id: number; name: string; subject_id: number };

export default function SubjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newChapterName, setNewChapterName] = useState<Record<number, string>>({});
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    loadAll();
  }, [authLoading, user]);

  async function loadAll() {
    setLoading(true);
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("user_id", user!.id)
      .order("name");
    setSubjects(subjectData ?? []);

    const { data: chapterData } = await supabase
      .from("chapters")
      .select("id, name, subject_id")
      .in("subject_id", (subjectData ?? []).map((s) => s.id));
    setChapters(chapterData ?? []);
    setLoading(false);
  }

  async function handleAddSubject() {
    const name = newSubjectName.trim();
    if (!name || !user) return;
    const { error } = await supabase.from("subjects").insert({ user_id: user.id, name });
    if (!error) {
      setNewSubjectName("");
      loadAll();
    }
  }

  async function handleDeleteSubject(id: number) {
    const confirmed = window.confirm("Xoá môn học này sẽ xoá luôn tất cả chương bên trong. Các bộ đề liên quan vẫn giữ nguyên, chỉ mất liên kết môn/chương. Tiếp tục?");
    if (!confirmed) return;
    await supabase.from("subjects").delete().eq("id", id);
    loadAll();
  }

  async function handleSaveSubjectName(id: number) {
    const name = editingSubjectName.trim();
    if (!name) return;
    await supabase.from("subjects").update({ name }).eq("id", id);
    setEditingSubjectId(null);
    loadAll();
  }

  async function handleAddChapter(subjectId: number) {
    const name = (newChapterName[subjectId] ?? "").trim();
    if (!name) return;
    await supabase.from("chapters").insert({ subject_id: subjectId, name });
    setNewChapterName((prev) => ({ ...prev, [subjectId]: "" }));
    loadAll();
  }

  async function handleDeleteChapter(id: number) {
    await supabase.from("chapters").delete().eq("id", id);
    loadAll();
  }

  if (authLoading || loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="p-8 max-w-3xl mx-auto animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Môn học & Chương</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Tổ chức bộ đề của bạn theo môn học và chương để dễ tìm và ôn tập hơn.
        </p>

        <Card className="p-5 mb-6">
          <div className="flex gap-2">
            <Input
              placeholder="Tên môn học mới, ví dụ: Kinh tế vi mô"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddSubject} leftIcon={<Plus size={16} />}>
              Thêm môn
            </Button>
          </div>
        </Card>

        {subjects.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            Bạn chưa có môn học nào. Thêm môn đầu tiên ở trên.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {subjects.map((subject) => {
              const subjectChapters = chapters.filter((c) => c.subject_id === subject.id);
              return (
                <Card key={subject.id} className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    {editingSubjectId === subject.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingSubjectName}
                          onChange={(e) => setEditingSubjectName(e.target.value)}
                          className="flex-1"
                        />
                        <button onClick={() => handleSaveSubjectName(subject.id)} className="p-1.5 text-success">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingSubjectId(null)} className="p-1.5 text-gray-400">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="font-semibold text-gray-900 dark:text-white">{subject.name}</h2>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSubjectId(subject.id);
                              setEditingSubjectName(subject.name);
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="p-1.5 text-gray-400 hover:text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-gray-100 dark:border-gray-800">
                    {subjectChapters.map((chapter) => (
                      <div key={chapter.id} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 py-1">
                        <span>{chapter.name}</span>
                        <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="p-1 text-gray-300 hover:text-danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        placeholder="Thêm chương mới..."
                        value={newChapterName[subject.id] ?? ""}
                        onChange={(e) => setNewChapterName((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button size="sm" variant="secondary" onClick={() => handleAddChapter(subject.id)} leftIcon={<Plus size={14} />}>
                        Thêm
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}