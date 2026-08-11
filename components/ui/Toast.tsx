"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextType = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const variantClasses: Record<ToastVariant, string> = {
  success: "border border-success/15 bg-success-soft text-foreground",
  error: "border border-danger/15 bg-danger-soft text-danger",
  info: "border border-border bg-surface text-foreground",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex max-w-[min(92vw,28rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className={cn("rounded-xl px-4 py-3 text-sm shadow-lg shadow-black/10 animate-fade-up", variantClasses[toast.variant])}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast phải được dùng bên trong ToastProvider");
  return context;
}
