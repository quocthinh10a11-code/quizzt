import { supabase } from "@/lib/supabase";

export type HeatmapDay = {
  date: string; // "YYYY-MM-DD"
  count: number;
};

export type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
};

// Lấy toàn bộ ngày có ít nhất 1 lượt làm bài trong N ngày gần nhất, gộp theo ngày (giờ VN, UTC+7)
export async function getHeatmapData(userId: string, days: number = 365): Promise<HeatmapDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const localDate = toVietnamDateKey(row.created_at);
    counts.set(localDate, (counts.get(localDate) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export async function getStreakInfo(userId: string): Promise<StreakInfo> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return { currentStreak: 0, longestStreak: 0, studiedToday: false };
  }

  const uniqueDays = Array.from(new Set(data.map((row) => toVietnamDateKey(row.created_at)))).sort(
    (a, b) => (a < b ? 1 : -1) // giảm dần
  );

  const todayKey = toVietnamDateKey(new Date().toISOString());
  const studiedToday = uniqueDays[0] === todayKey;

  // Tính streak hiện tại: đếm số ngày liên tiếp lùi từ hôm nay (hoặc hôm qua nếu hôm nay chưa học)
  let currentStreak = 0;
  const cursor = new Date(todayKey + "T00:00:00");
  if (!studiedToday) {
    // Nếu hôm nay chưa học, streak vẫn tính được nếu hôm qua có học (chưa "gãy" tới hết ngày hôm nay)
    cursor.setDate(cursor.getDate() - 1);
  }
  const daySet = new Set(uniqueDays);
  while (daySet.has(dateKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Tính streak dài nhất trong toàn bộ lịch sử
  let longestStreak = 0;
  let run = 0;
  const sortedAsc = [...uniqueDays].sort();
  for (let i = 0; i < sortedAsc.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(sortedAsc[i - 1] + "T00:00:00");
      prev.setDate(prev.getDate() + 1);
      run = dateKey(prev) === sortedAsc[i] ? run + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, run);
  }

  return { currentStreak, longestStreak, studiedToday };
}

function toVietnamDateKey(isoString: string): string {
  const d = new Date(isoString);
  // Cộng lệch múi giờ VN (UTC+7) trước khi cắt ngày, để "hôm nay" tính đúng theo giờ VN
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}