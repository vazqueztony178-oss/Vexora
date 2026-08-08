import { useState, useRef, useEffect } from 'react';
import { MessageCircle, UserCheck, UserX, Flag, Ban, ChevronDown, Check, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ReportReason } from '@/types';

interface FollowingMenuProps {
  onMessage: () => void;
  onViewFriendship: () => void;
  onUnfollow: () => void;
  onReport: (reason: ReportReason, explanation: string) => void;
  onBlock: () => void;
}

export function FollowingMenu({ onMessage, onViewFriendship, onUnfollow, onReport, onBlock }: FollowingMenuProps) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showUnfollow, setShowUnfollow] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && menuRef.current && !btnRef.current.contains(e.target as Node) && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const closeAll = () => {
    setOpen(false);
    setShowReport(false);
    setShowUnfollow(false);
    setShowBlock(false);
  };

  const handleAction = (fn: () => void, closeMenu = true) => {
    fn();
    if (closeMenu) setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={btnRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm"
        >
          <UserCheck size={15} /> Siguiendo
          <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="absolute right-0 z-50 mt-2 w-64 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card"
          >
            <MenuItem icon={MessageCircle} label="Mensaje" onClick={() => handleAction(onMessage)} />
            <MenuItem icon={UserCheck} label="Ver amistad / seguimiento" onClick={() => handleAction(onViewFriendship)} />
            <div className="my-1 h-px bg-[var(--vex-border-soft)]" />
            <MenuItem icon={UserX} label="Dejar de seguir" onClick={() => { setShowUnfollow(true); setOpen(false); }} />
            <MenuItem icon={Flag} label="Reportar usuario" danger onClick={() => { setShowReport(true); setOpen(false); }} />
            <MenuItem icon={Ban} label="Bloquear usuario" danger onClick={() => { setShowBlock(true); setOpen(false); }} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={showUnfollow}
        title="¿Dejar de seguir?"
        message="¿Quieres dejar de seguir a esta persona? Podrás volver a seguirla cuando quieras."
        confirmLabel="Dejar de seguir"
        danger
        onConfirm={() => { onUnfollow(); closeAll(); }}
        onCancel={closeAll}
      />

      <ConfirmDialog
        open={showBlock}
        title="¿Bloquear usuario?"
        message="Al bloquear a esta persona dejarás de seguirla, sus publicaciones se ocultarán y no podrá enviarte mensajes ni interactuar contigo. Puedes desbloquearla desde Configuración > Privacidad."
        confirmLabel="Bloquear"
        danger
        onConfirm={() => { onBlock(); closeAll(); }}
        onCancel={closeAll}
      />

      {showReport && (
        <ReportDialog
          onCancel={closeAll}
          onSubmit={(reason, explanation) => { onReport(reason, explanation); closeAll(); }}
        />
      )}
    </>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Flag; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition',
        danger ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30' : 'text-app hover:bg-[var(--vex-surface-2)]',
      )}
    >
      <Icon size={17} className={danger ? 'text-red-500 dark:text-red-400' : 'text-brand-500'} />
      {label}
    </button>
  );
}

const REPORT_REASONS: Array<{ key: ReportReason; label: string; desc: string }> = [
  { key: 'spam', label: 'Spam', desc: 'Publicidad o mensajes repetitivos no deseados' },
  { key: 'harassment', label: 'Acoso', desc: 'Insultos, amenazas o comportamiento abusivo' },
  { key: 'inappropriate', label: 'Contenido inapropiado', desc: 'Material ofensivo o no apto para la comunidad' },
  { key: 'impersonation', label: 'Suplantación de identidad', desc: 'Finge ser otra persona' },
  { key: 'scam', label: 'Estafa', desc: 'Intento de fraude o engaño' },
  { key: 'other', label: 'Otro', desc: 'Otro motivo no listado arriba' },
];

function ReportDialog({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (reason: ReportReason, explanation: string) => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [explanation, setExplanation] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md animate-scale-in rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-soft p-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
              <ShieldAlert size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="font-display text-lg font-bold text-strong">Reportar usuario</h2>
          </div>
          <button onClick={onCancel} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <p className="mb-3 text-sm text-muted">Cuéntanos qué problema tiene este usuario:</p>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                  reason === r.key ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-app hover:bg-[var(--vex-surface-2)]',
                )}
              >
                <div className={cn('mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition', reason === r.key ? 'border-brand-500 bg-brand-500' : 'border-[var(--vex-border)]')}>
                  {reason === r.key && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-strong">{r.label}</p>
                  <p className="text-xs text-muted">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="label">Explicación (opcional)</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              maxLength={500}
              placeholder="Añade detalles para ayudar al equipo de moderación..."
              className="input min-h-20 resize-none"
            />
            <p className="mt-1 text-right text-xs text-muted">{explanation.length}/500</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-soft p-4">
          <button onClick={onCancel} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button
            onClick={() => reason && onSubmit(reason, explanation)}
            disabled={!reason}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
          >
            <AlertTriangle size={16} /> Enviar reporte
          </button>
        </div>
      </div>
    </div>
  );
}
