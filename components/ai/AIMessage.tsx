"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
};

export default function AIMessage({ content }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group relative">
      <div
        className={cn(
          "text-sm leading-relaxed text-gray-800 dark:text-muted",
          "prose prose-sm dark:prose-invert max-w-none",
          "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1",
          "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
          "prose-strong:text-gray-900 dark:prose-strong:text-white",
          "prose-blockquote:border-l-primary prose-blockquote:text-foreground/80 dark:prose-blockquote:text-muted prose-blockquote:not-italic",
          "prose-code:text-primary prose-code:before:content-[''] prose-code:after:content-['']",
          "prose-pre:bg-surface dark:prose-pre:bg-black prose-pre:text-gray-100"
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>

      <button
        onClick={handleCopy}
        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-white dark:bg-surface-muted border border-border text-muted hover:text-primary"
        aria-label="Copy"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}