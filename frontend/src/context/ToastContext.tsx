import { useState, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContext, type ToastType } from "./toastContextDef";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg border ${
                t.type === "success"
                  ? "bg-emerald-900/90 border-emerald-500/50 text-emerald-100"
                  : t.type === "error"
                  ? "bg-red-900/90 border-red-500/50 text-red-100"
                  : "bg-muted/90 border-border text-foreground"
              } backdrop-blur-md`}
            >
              {t.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-400" />}
              {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
              {t.type === "info" && <Info className="h-5 w-5 text-accent" />}
              
              <p className="text-sm font-medium">{t.message}</p>
              
              <button onClick={() => removeToast(t.id)} className="ml-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
