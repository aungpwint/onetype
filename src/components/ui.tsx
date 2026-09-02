import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 justify-center text-ink-soft" role="status">
      <div className="h-4 w-4 rounded-full border-2 border-line-strong border-t-accent animate-spin" />
      {label ? <span className="text-sm">{label}</span> : null}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`card relative z-10 w-full ${width} p-6 shadow-2xl`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-8 py-14 text-center">
      <p className="font-display text-xl">{title}</p>
      <div className="max-w-md text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-1 font-display text-2xl leading-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-brass";