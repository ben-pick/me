import { useEffect } from "react";
import { actions, useStore } from "../lib/store.ts";

export const Toast = () => {
  const toast = useStore((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => actions.clearToast(toast.id), 2000);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
    >
      {toast ? (
        <div
          key={toast.id}
          className="animate-toast border border-cream/20 bg-ink px-4 py-3 font-mono text-[12px] uppercase text-cream"
        >
          {toast.text}
        </div>
      ) : null}
    </div>
  );
};
