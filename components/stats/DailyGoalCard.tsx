"use client";

import { useEffect, useState } from "react";
import { Target, Pencil, Check } from "lucide-react";
import { getDailyGoal, setDailyGoal, getTodayProgress } from "@/lib/dailyGoal";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
};

export default function DailyGoalCard({ userId }: Props) {
  const [goal, setGoal] = useState(20);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("20");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [g, p] = await Promise.all([getDailyGoal(userId), getTodayProgress(userId)]);
      setGoal(g);
      setInputValue(String(g));
      setProgress(p);
      setLoading(false);
    }
    load();
  }, [userId]);

  async function handleSave() {
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < 1) return;
    setSaving(true);
    const { error } = await setDailyGoal(userId, num);
    if (!error) {
      setGoal(num);
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) return <Card className="p-6 h-24 animate-pulse" />;

  const pct = Math.min(100, Math.round((progress / goal) * 100));
  const reached = progress >= goal;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={18} className={reached ? "text-success" : "text-primary"} />
          <h2 className="font-semibold text-gray-900 dark:text-white">Mục tiêu hôm nay</h2>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-gray-400 hover:text-primary transition-colors p-1"
            aria-label="Sửa mục tiêu"
          >
            <Pencil size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-16 px-2 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-success hover:opacity-80 p-1"
              aria-label="Lưu mục tiêu"
            >
              <Check size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between mb-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {progress}
          <span className="text-base font-normal text-gray-400 dark:text-gray-500"> / {goal} câu</span>
        </p>
        {reached && <span className="text-sm text-success font-medium">Đã đạt mục tiêu! 🎉</span>}
      </div>

      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", reached ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}