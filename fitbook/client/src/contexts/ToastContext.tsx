import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface Toast { id: number; title: string; description?: string; variant: 'success' | 'error' | 'info'; }

const ToastContext = createContext<{ toast: (t: Omit<Toast, 'id'>) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-fade-in flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-lg">
            {t.variant === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-lime-600" />}
            {t.variant === 'error' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
            {t.variant === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
            </div>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
