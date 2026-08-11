"use client";

import { useEffect, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import { getHeatmapData, getStreakInfo, type HeatmapDay, type StreakInfo } from "@/lib/learningStats";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
};

const WEEKS_TO_SHOW = 20; // ~140 ngày gần nhất, vừa đủ gọn để hiện trên 1 hàng ngang

function levelForCount(count: number): number {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const LEVEL_CLASS = [
  "bg-surface-muted",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
];

export default function StreakHeatmap({ userId }: Props) {
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [heatmap, streakInfo] = await Promise.all([
        getHeatmapData(userId, WEEKS_TO_SHOW * 7),
        getStreakInfo(userId),
      ]);
      setDays(heatmap);
      setStreak(streakInfo);
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return <Card className="p-6 h-40 animate-pulse" />;
  }

  const countMap = new Map(days.map((d) => [d.date, d.count]));

  // Dựng lưới 7 hàng (Chủ nhật -> Thứ 7) x WEEKS_TO_SHOW cột, tính từ hôm nay lùi về
  const today = new Date();
  const gridStart = new Date(today);
  gridStart.setDate(gridStart.getDate() - (WEEKS_TO_SHOW * 7 - 1));
  // Căn về đầu tuần (Chủ nhật) gần nhất trước gridStart
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const columns: { date: string; count: number }[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < WEEKS_TO_SHOW + 1; w++) {
    const column: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10);
      column.push({ date: key, count: countMap.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(column);
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-6 mb-5">
        <div className="flex items-center gap-2">
          <Flame size={20} className={streak && streak.currentStreak > 0 ? "text-orange-500" : "text-muted dark:text-foreground/80"} />
          <div>
            <p className="text-xl font-bold text-foreground leading-tight">
              {streak?.currentStreak ?? 0} ngày
            </p>
            <p className="text-xs text-muted">Chuỗi hiện tại</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-amber-500" />
          <div>
            <p className="text-xl font-bold text-foreground leading-tight">
              {streak?.longestStreak ?? 0} ngày
            </p>
            <p className="text-xs text-muted">Chuỗi dài nhất</p>
          </div>
        </div>
        {streak && streak.currentStreak > 0 && !streak.studiedToday && (
          <p className="text-xs text-warning">Hôm nay chưa học — làm 1 bài để giữ chuỗi!</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1 w-fit">
          {columns.map((column, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-1">
              {column.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} lượt`}
                  className={cn("w-3 h-3 rounded-sm", LEVEL_CLASS[levelForCount(day.count)])}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted">
        <span>Ít</span>
        {LEVEL_CLASS.map((cls, i) => (
          <div key={i} className={cn("w-3 h-3 rounded-sm", cls)} />
        ))}
        <span>Nhiều</span>
      </div>
    </Card>
  );
}