"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => setConfirmDialog({ message, resolve }));
  }, []);

  const iconMap: Record<ToastType, string> = { success: "check_circle", error: "error", info: "info" };
  const colorMap: Record<ToastType, string> = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-zinc-800 text-white border border-zinc-700",
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.2s_ease-out] ${colorMap[t.type]}`}
          >
            <span className="material-symbols-outlined text-[18px]">{iconMap[t.type]}</span>
            {t.message}
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}>
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-2xl max-w-md mx-4 border border-outline-variant" onClick={e => e.stopPropagation()}>
            <p className="text-on-surface text-body-md mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}
                className="px-5 py-2 rounded-lg border border-outline text-on-surface font-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}
                className="px-5 py-2 rounded-lg bg-error text-on-error font-label-md hover:opacity-90 transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
