"use client";

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { getUserTags, type Tag } from "@/lib/quizTags";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

type Props = {
  userId: string;
  selectedNames: string[];
  onChange: (names: string[]) => void;
};

export default function TagPicker({ userId, selectedNames, onChange }: Props) {
  const [existingTags, setExistingTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    async function load() {
      const tags = await getUserTags(userId);
      setExistingTags(tags);
    }
    load();
  }, [userId]);

  function addTag(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const alreadySelected = selectedNames.some(
      (n) => n.toLowerCase() === name.toLowerCase()
    );
    if (alreadySelected) return;
    onChange([...selectedNames, name]);
    setInputValue("");
  }

  function removeTag(name: string) {
    onChange(selectedNames.filter((n) => n !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
  }

  const suggestions = existingTags.filter(
    (t) => !selectedNames.some((n) => n.toLowerCase() === t.name.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Nhãn (tuỳ chọn)
      </label>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNames.map((name) => (
            <Badge key={name} variant="primary">
              {name}
              <button
                type="button"
                onClick={() => removeTag(name)}
                aria-label={`Gỡ nhãn ${name}`}
                className="ml-1 hover:text-danger"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Gõ tên nhãn rồi Enter..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => addTag(inputValue)}
          aria-label="Thêm nhãn"
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-primary hover:border-primary transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {suggestions.map((tag) => (
            <button
              type="button"
              key={tag.id}
              onClick={() => addTag(tag.name)}
              className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}