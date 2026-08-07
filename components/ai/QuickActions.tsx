"use client";

import type { QuickAction } from "@/lib/ai/types/tutor";

type Props = {
  actions: QuickAction[];
  onSelect: (action: QuickAction) => void;
  disabled?: boolean;
};

// Component thuần — không biết gì về Practice/Review/Smart Review, chỉ render
// đúng những gì được truyền vào và gọi onSelect khi bấm. Toàn bộ "trí thông minh"
// (nút nào ứng với màn nào) nằm ở lib/ai/quickActions.ts, không nằm ở đây.
export default function QuickActions({ actions, onSelect, disabled }: Props) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onSelect(action)}
          disabled={disabled}
          className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}