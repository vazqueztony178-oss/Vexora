import { useState, useRef, useEffect } from 'react';
import { EMOJI_CATEGORIES } from '@/lib/emoji';
import { cn } from '@/lib/cn';
import { Search, X } from 'lucide-react';

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const [activeCat, setActiveCat] = useState(0);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const currentEmojis = query
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(query) || true).slice(0, 80)
    : EMOJI_CATEGORIES[activeCat].emojis;

  return (
    <div ref={panelRef} className="absolute bottom-14 left-0 z-50 flex h-80 w-72 animate-scale-in flex-col overflow-hidden rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card sm:w-80">
      <div className="flex items-center gap-2 border-b border-soft p-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar emoji..."
            className="w-full rounded-lg border border-app bg-[var(--vex-surface-2)] py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <button onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-[var(--vex-surface-2)]">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-7 gap-0.5 sm:grid-cols-8">
          {currentEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onPick(emoji)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-[var(--vex-surface-2)] active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {!query && (
        <div className="flex items-center gap-1 border-t border-soft p-1.5">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCat(i)}
              className={cn(
                'inline-flex h-8 flex-1 items-center justify-center rounded-lg text-base transition',
                activeCat === i ? 'bg-[var(--vex-surface-2)]' : 'hover:bg-[var(--vex-surface-2)] opacity-60',
              )}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
