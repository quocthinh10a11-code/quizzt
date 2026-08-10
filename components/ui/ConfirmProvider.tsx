"use client";

import { createContext, useCallback, useContext, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type Request = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setRequest({ ...options, resolve }));
  }, []);

  const close = useCallback((result: boolean) => {
    if (!request) return;
    request.resolve(result);
    setRequest(null);
  }, [request]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={Boolean(request)}
        title={request?.title ?? ""}
        description={request?.description ?? ""}
        confirmLabel={request?.confirmLabel ?? "Xác nhận"}
        cancelLabel={request?.cancelLabel ?? "Huỷ"}
        onConfirm={() => close(true)}
        onClose={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return { confirm };
}
