"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  questionContext: {
    content: string;
    options: string[];
    correctIndex: number;
  };
  // Đổi giá trị này (ví dụ questionId) mỗi khi sang câu khác, để component tự reset lịch sử chat
  resetKey: string | number;
};

export default function AiTutorChat({ questionContext, resetKey }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sang câu hỏi khác -> xoá lịch sử chat cũ, tránh AI trả lời nhầm ngữ cảnh câu trước
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError("");
  }, [resetKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError("");
    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionContext,
          history: messages,
          userMessage: trimmed,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Không thể lấy phản hồi từ AI.");
        setLoading(false);
        return;
      }

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Lỗi kết nối tới máy chủ AI.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-all"
      >
        <MessageCircle size={18} />
        <span className="text-sm font-medium">Hỏi AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-primary/5">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Hỏi AI về câu này</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-danger transition-colors"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 max-h-80 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Hỏi AI bất cứ điều gì về câu hỏi đang xem — ví dụ: &quot;Tại sao đáp án B sai?&quot;, &quot;Giải thích khái niệm này giúp mình&quot;.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] px-3 py-2 rounded-lg text-sm",
              m.role === "user"
                ? "self-end bg-primary text-white"
                : "self-start bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            )}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="self-start flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <Loader2 size={12} className="animate-spin" />
            AI đang trả lời...
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-gray-100 dark:border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Nhập câu hỏi..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2 rounded-lg bg-primary text-white disabled:opacity-40 hover:bg-primary-hover transition-colors"
          aria-label="Gửi"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}