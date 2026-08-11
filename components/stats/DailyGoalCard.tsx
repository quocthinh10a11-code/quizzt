"use client";

import { useEffect, useState } from "react";
import { Target, Pencil, Check, Sparkles } from "lucide-react";
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
  const [errorMessage, setErrorMessage] = useState("");

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

  function handleStartEdit() {
    setErrorMessage("");
    setInputValue(String(goal));
    setEditing(true);
  }

  async function handleSave() {
    if (saving) return; // chặn gọi trùng nếu Enter bị bấm nhiều lần liên tiếp trước khi state saving kịp cập nhật

    setErrorMessage("");

    if (inputValue.trim() === "") {
      setErrorMessage("Vui lòng nhập số câu.");
      return;
    }

    const num = parseInt(inputValue, 10);

    if (isNaN(num)) {
      setErrorMessage("Giá trị không hợp lệ.");
      return;
    }
    if (num < 1) {
      setErrorMessage("Mục tiêu phải từ 1 câu trở lên.");
      return;
    }
    if (num > 500) {
      setErrorMessage("Mục tiêu tối đa 500 câu/ngày.");
      return;
    }

    setSaving(true);
    const { error } = await setDailyGoal(userId, num);
    setSaving(false);

    if (error) {
      // Không đóng chế độ edit khi lỗi, để người dùng thấy lỗi và có thể sửa/thử lại
      setErrorMessage("Không thể lưu mục tiêu: " + error);
      return;
    }

    setGoal(num);
    setEditing(false);
  }

  function handleCancel() {
    setErrorMessage("");
    setInputValue(String(goal));
    setEditing(false);
  }

  if (loading) return <Card className="p-6 h-24 animate-pulse" />;

  const pct = Math.min(100, Math.round((progress / goal) * 100));
  const reached = progress >= goal;
  const hasStarted = progress > 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={18} className={reached ? "text-success" : "text-primary"} />
          <h2 className="font-semibold text-foreground">Mục tiêu hôm nay</h2>
        </div>

        {!editing ? (
          <button
            onClick={handleStartEdit}
            className="text-muted hover:text-primary transition-colors p-1"
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape" && !saving) {
                  e.preventDefault();
                  handleCancel();
                }
              }}
              disabled={saving}
              className="w-16 px-2 py-1 text-sm rounded-md border border-border bg-surface text-foreground disabled:opacity-50"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-success hover:opacity-80 p-1 disabled:opacity-40"
              aria-label="Lưu mục tiêu"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-muted hover:text-danger p-1 text-xs disabled:opacity-40"
              aria-label="Huỷ"
            >
              Huỷ
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-danger mb-2">{errorMessage}</p>
      )}

      {!hasStarted ? (
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Sparkles size={14} className="text-primary shrink-0" />
          <span>
            Chưa có lượt học nào hôm nay. Làm 1 bộ đề để bắt đầu chuỗi ngày học của bạn!
          </span>
        </div>
      ) : (
        <div className="flex items-end justify-between mb-2">
          <p className="text-2xl font-bold text-foreground">
            {progress}
            <span className="text-base font-normal text-muted"> / {goal} câu</span>
          </p>
          {reached && <span className="text-sm text-success font-medium">Đã đạt mục tiêu! 🎉</span>}
        </div>
      )}

      {!hasStarted && (
        <p className="text-sm text-muted mb-2">0 / {goal} câu</p>
      )}

      <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", reached ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}