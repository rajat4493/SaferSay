"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ToastInput = {
  variant?: ToastVariant;
  message: string;
  /** ms before auto-dismiss; errors default longer so they're not missed. */
  duration?: number;
};

type ToastContextValue = {
  show: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * App-wide toast notifications -- the "did it work" feedback the UX audit
 * flagged as missing (no success/error confirmation after saves, invite
 * sends, imports). Mounted once in the root layout so every surface can
 * call useToast() without its own provider.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ variant = "info", message, duration }: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, variant, message }]);
      const timeout = duration ?? (variant === "error" ? 6000 : 3500);
      setTimeout(() => dismiss(id), timeout);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const variantStyles: Record<ToastVariant, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: "border-[var(--brand-accent-soft)] bg-[var(--brand-accent)] text-white" },
  error: { icon: AlertTriangle, classes: "border-[#e3b3a8] bg-[#9a392d] text-white" },
  info: { icon: Info, classes: "border-[var(--brand-border)] bg-[var(--brand-ink)] text-white" },
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { icon: Icon, classes } = variantStyles[toast.variant];
  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-card)] border px-4 py-3 shadow-[var(--shadow-elevated)] ${classes}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm font-semibold leading-5">{toast.message}</p>
      <button onClick={onDismiss} aria-label="Dismiss notification" className="shrink-0 opacity-80 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // A missing provider shouldn't crash the page over a notification --
    // fall back to a no-op so callers stay simple.
    return { show: () => undefined };
  }
  return context;
}
