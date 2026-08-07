"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AIMessage from "./AIMessage";
import type { TutorScreenContext, ReviewMeta } from "@/lib/ai/types/tutor";

type Message = {
  role: "user" | "assistant" | "divider";
  content: string;
};

type Props = {
  questionContext: {
    content: string;
    options: string[];
    correctIndex: number;
  };
  // Đổi giá trị này (ví dụ questionId) mỗi khi sang câu khác.
  resetKey: string | number;
  // true nếu học sinh đã nộp bài / đang xem lại đáp án (chế độ Review).
  // false nếu đang làm bài dở (chế độ Learning) — AI sẽ KHÔNG được cấp đáp án đúng.
  submitted: boolean;
  // Màn hình đang gọi component này. Optional để tương thích ngược với nơi gọi
  // chưa cập nhật — mặc định "practice" nếu không truyền.
  screenContext?: TutorScreenContext;
  // Dữ liệu Spaced Repetition, chỉ có ý nghĩa khi screenContext = "smart_review".
  // Component tự loại bỏ field này khỏi request nếu screenContext khác "smart_review",
  // không hardcode "smart_review" ở đâu trong logic — chỉ so sánh với prop được truyền vào.
  reviewMeta?: ReviewMeta;
};

export default function AiTutorChat({
  questionContext,
  resetKey,
  submitted,
  screenContext = "practice",
  reviewMeta,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const prevResetKey = useRef(resetKey);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevResetKey.current = resetKey;
      return;
    }
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      setMessages((prev) =>
        prev.length > 0 ? [...prev, { role: "divider", content: "Đã chuyển sang câu hỏi mới" }] : prev
      );
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const apiHistory = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionContext: submitted
            ? questionContext
            : { content: questionContext.content, options: questionContext.options },
          submitted,
          history: apiHistory,
          userMessage: trimmed,
          screenContext,
          // Chỉ gửi reviewMeta khi đúng screenContext, đúng contract Bước 3 —
          // tránh gửi field thừa khi không cần (route sẽ bỏ qua nếu có, nhưng
          // không gửi ngay từ đầu vẫn sạch hơn).
          ...(screenContext === "smart_review" && reviewMeta ? { reviewMeta } : {}),
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
    <div className="fixed bottom-6 right-6 z-30 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-primary/5">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Hỏi AI về câu này</span>
          {!submitted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
              Chế độ gợi mở
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-danger transition-colors"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 max-h-96 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Hỏi AI bất cứ điều gì về câu hỏi đang xem — ví dụ: &quot;Giải thích khái niệm này giúp mình&quot;.
            {!submitted && " AI sẽ gợi mở tư duy trước, chưa đưa đáp án ngay."}
          </p>
        )}

        {messages.map((m, i) =>
          m.role === "divider" ? (
            <div key={i} className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{m.content}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
          ) : (
            <div
              key={i}
              className={cn(
                "max-w-[90%] px-3 py-2 rounded-lg",
                m.role === "user"
                  ? "self-end bg-primary text-white text-sm whitespace-pre-wrap break-words"
                  : "self-start bg-gray-100 dark:bg-gray-800"
              )}
            >
              {m.role === "assistant" ? <AIMessage content={m.content} /> : m.content}
            </div>
          )
        )}

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