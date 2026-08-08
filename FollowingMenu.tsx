import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm animate-scale-in rounded-2xl border border-app bg-[var(--vex-surface)] p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full ${danger ? 'bg-red-100 dark:bg-red-950/50' : 'bg-amber-100 dark:bg-amber-950/50'}`}>
            <AlertTriangle size={26} className={danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
          </div>
          <h2 className="font-display text-lg font-bold text-strong">{title}</h2>
          <p className="mt-1.5 text-sm text-muted">{message}</p>
          <div className="mt-5 flex w-full gap-3">
            <button onClick={onCancel} className="btn-ghost flex-1 py-2.5 text-sm">
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] ${
                danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
