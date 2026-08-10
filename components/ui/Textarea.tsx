"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  helperText?: string;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={!!error}
        className={cn(
          "w-full rounded-lg border px-4 py-2 text-sm font-mono",
          "bg-surface",
          "text-black dark:text-white",
          "placeholder:text-muted dark:placeholder:text-foreground/80",
          "transition-all duration-150",
          "focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary",
          error
            ? "border-danger focus:border-danger focus:ring-danger/20"
            : "border-gray-300 dark:border-gray-700",
          className
        )}
        {...props}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && helperText && <p className="text-sm text-muted">{helperText}</p>}
    </div>
  );
});

export default Textarea;