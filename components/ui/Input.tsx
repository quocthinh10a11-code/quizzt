"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, leftIcon, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={cn(
            "w-full rounded-lg border px-4 py-2 text-sm",
            "bg-surface",
            "text-black dark:text-white",
            "placeholder:text-muted dark:placeholder:text-foreground/80",
            "transition-all duration-150",
            "focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary",
            error
              ? "border-danger focus:border-danger focus:ring-danger/20"
              : "border-gray-300 dark:border-gray-700",
            leftIcon && "pl-10",
            className
          )}
          {...props}
        />
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="text-sm text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;