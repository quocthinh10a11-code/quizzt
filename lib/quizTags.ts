import { supabase } from "@/lib/supabase";

export type Tag = {
  id: number;
  name: string;
};

// Lấy toàn bộ tag của 1 user (dùng cho TagPicker gợi ý danh sách có sẵn)
export async function getUserTags(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .eq("user_id", userId)
    .order("name");

  if (error || !data) return [];
  return data;
}

// Lấy tag đang gắn trên 1 quiz cụ thể
export async function getQuizTags(quizId: number): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("quiz_tags")
    .select("tags(id, name)")
    .eq("quiz_id", quizId);

  if (error || !data) return [];
  return data
    .map((row: any) => row.tags)
    .filter(Boolean);
}

// Lấy tag của nhiều quiz cùng lúc (dùng cho danh sách QuizCard, tránh N+1 query)
export async function getTagsForQuizzes(
  quizIds: number[]
): Promise<Record<number, Tag[]>> {
  if (quizIds.length === 0) return {};

  const { data, error } = await supabase
    .from("quiz_tags")
    .select("quiz_id, tags(id, name)")
    .in("quiz_id", quizIds);

  if (error || !data) return {};

  const map: Record<number, Tag[]> = {};
  data.forEach((row: any) => {
    if (!row.tags) return;
    if (!map[row.quiz_id]) map[row.quiz_id] = [];
    map[row.quiz_id].push(row.tags);
  });
  return map;
}

// Tìm tag theo tên (case-insensitive) hoặc tạo mới nếu chưa có, trả về id
async function findOrCreateTag(userId: string, name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name: trimmed })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

// Đồng bộ danh sách tag (theo tên) cho 1 quiz: tạo tag chưa có, gắn tag mới,
// gỡ tag không còn được chọn. Dùng khi Lưu ở trang Create/Edit quiz.
export async function syncQuizTags(
  quizId: number,
  userId: string,
  tagNames: string[]
): Promise<{ error: string | null }> {
  // 1. Tìm hoặc tạo id cho từng tên tag
  const tagIds: number[] = [];
  for (const name of tagNames) {
    const id = await findOrCreateTag(userId, name);
    if (id !== null) tagIds.push(id);
  }

  // 2. Lấy tag hiện đang gắn trên quiz để so sánh
  const { data: currentRows, error: fetchError } = await supabase
    .from("quiz_tags")
    .select("tag_id")
    .eq("quiz_id", quizId);

  if (fetchError) {
    return { error: "Không đọc được tag hiện tại: " + fetchError.message };
  }

  const currentIds = (currentRows ?? []).map((r) => r.tag_id);
  const toAdd = tagIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !tagIds.includes(id));

  // 3. Gỡ tag không còn được chọn
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("quiz_tags")
      .delete()
      .eq("quiz_id", quizId)
      .in("tag_id", toRemove);

    if (error) return { error: "Lỗi khi gỡ tag: " + error.message };
  }

  // 4. Gắn tag mới
  if (toAdd.length > 0) {
    const rows = toAdd.map((tag_id) => ({ quiz_id: quizId, tag_id }));
    const { error } = await supabase.from("quiz_tags").insert(rows);

    if (error) return { error: "Lỗi khi gắn tag: " + error.message };
  }

  return { error: null };
}