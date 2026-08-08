import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { PRIVACY_OPTIONS, privacyOption } from '@/lib/privacy';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { PostVisibility } from '@/types';

interface PrivacySelectorProps {
  value: PostVisibility;
  exceptUserIds: string[];
  allowedUserIds: string[];
  onChange: (v: PostVisibility, exceptIds: string[], allowedIds: string[]) => void;
  compact?: boolean;
}

export function PrivacySelector({ value, exceptUserIds, allowedUserIds, onChange, compact }: PrivacySelectorProps) {
  const { currentUser, users } = useApp();
  const [open, setOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<'except' | 'custom' | null>(null);
  const [localExcept, setLocalExcept] = useState(exceptUserIds);
  const [localAllowed, setLocalAllowed] = useState(allowedUserIds);
  const ref = useRef<HTMLDivElement>(null);
  const opt = privacyOption(value);

  useEffect(() => {
    setLocalExcept(exceptUserIds);
    setLocalAllowed(allowedUserIds);
  }, [exceptUserIds, allowedUserIds]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSubPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!currentUser) return null;

  const friends = users.filter((u) => currentUser.following.includes(u.id));

  const selectOption = (v: PostVisibility) => {
    if (v === 'friends_except') {
      setSubPanel('except');
      onChange(v, localExcept, []);
    } else if (v === 'custom') {
      setSubPanel('custom');
      onChange(v, [], localAllowed);
    } else {
      setOpen(false);
      setSubPanel(null);
      onChange(v, [], []);
    }
  };

  const toggleUser = (id: string, list: 'except' | 'custom') => {
    if (list === 'except') {
      const next = localExcept.includes(id) ? localExcept.filter((x) => x !== id) : [...localExcept, id];
      setLocalExcept(next);
      onChange('friends_except', next, []);
    } else {
      const next = localAllowed.includes(id) ? localAllowed.filter((x) => x !== id) : [...localAllowed, id];
      setLocalAllowed(next);
      onChange('custom', [], next);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
          'border-app bg-[var(--vex-surface-2)] text-app hover:bg-[var(--vex-border-soft)]',
        )}
      >
        <opt.icon size={14} className={opt.color} />
        {!compact && opt.short}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 rounded-2xl border border-app bg-[var(--vex-surface)] p-1.5 shadow-card">
          {subPanel === null && (
            <>
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">¿Quién puede verlo?</p>
              {PRIVACY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => selectOption(o.value)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--vex-surface-2)]"
                >
                  <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--vex-surface-2)]', o.color)}>
                    <o.icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-strong">{o.label}</span>
                    <span className="block truncate text-xs text-muted">{o.description}</span>
                  </span>
                  {value === o.value && <Check size={16} className="shrink-0 text-brand-500" />}
                </button>
              ))}
            </>
          )}

          {subPanel === 'except' && (
            <ExceptOrCustomPanel
              title="Amigos excepto…"
              friends={friends}
              selected={localExcept}
              onToggle={(id) => toggleUser(id, 'except')}
              onBack={() => setSubPanel(null)}
              onDone={() => { setOpen(false); setSubPanel(null); }}
            />
          )}

          {subPanel === 'custom' && (
            <ExceptOrCustomPanel
              title="Lista personalizada"
              friends={friends}
              selected={localAllowed}
              onToggle={(id) => toggleUser(id, 'custom')}
              onBack={() => setSubPanel(null)}
              onDone={() => { setOpen(false); setSubPanel(null); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ExceptOrCustomPanel({
  title,
  friends,
  selected,
  onToggle,
  onBack,
  onDone,
}: {
  title: string;
  friends: ReturnType<typeof useApp>['users'];
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={onBack} className="text-sm font-semibold text-brand-600 dark:text-brand-400">← Atrás</button>
        <span className="text-sm font-bold text-strong">{title}</span>
      </div>
      {friends.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-muted">No tienes amigos para seleccionar.</p>
      )}
      <div className="max-h-60 overflow-y-auto">
        {friends.map((f) => {
          const active = selected.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => onToggle(f.id)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--vex-surface-2)]"
            >
              <Avatar user={f} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-strong">{fullName(f)}</span>
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', active ? 'border-brand-500 bg-brand-500 text-white' : 'border-[var(--vex-border)]')}>
                {active && <Check size={12} />}
              </span>
            </button>
          );
        })}
      </div>
      <button onClick={onDone} className="mt-1 w-full rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white">
        Hecho {selected.length > 0 && `(${selected.length})`}
      </button>
    </>
  );
}
