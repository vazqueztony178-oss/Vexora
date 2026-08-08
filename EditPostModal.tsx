import { useEffect, useRef, useState } from 'react';
import type { ReactionType } from '@/types';
import { cn } from '@/lib/cn';

interface ReactionDef {
  type: ReactionType;
  emoji: string;
  label: string;
}

export const REACTIONS: ReactionDef[] = [
  { type: 'like', emoji: '👍', label: 'Me gusta' },
  { type: 'love', emoji: '❤️', label: 'Me encanta' },
  { type: 'haha', emoji: '😂', label: 'Me divierte' },
  { type: 'wow', emoji: '😮', label: 'Me sorprende' },
  { type: 'sad', emoji: '😢', label: 'Me entristece' },
  { type: 'angry', emoji: '😡', label: 'Me enoja' },
  { type: 'clap', emoji: '👏', label: 'Aplausos' },
  { type: 'fire', emoji: '🔥', label: 'Increíble' },
  { type: 'hundred', emoji: '💯', label: 'Excelente' },
  { type: 'hug', emoji: '🤗', label: 'Abrazo' },
];

export const REACTION_MAP: Record<ReactionType, ReactionDef> = Object.fromEntries(
  REACTIONS.map((r) => [r.type, r]),
) as Record<ReactionType, ReactionDef>;

interface ReactionPickerProps {
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<ReactionType | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-12 left-0 z-50 flex animate-scale-in gap-0.5 rounded-full border border-app bg-[var(--vex-surface)] px-2 py-1.5 shadow-card"
    >
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          onClick={() => { onSelect(r.type); onClose(); }}
          onMouseEnter={() => setHovered(r.type)}
          onMouseLeave={() => setHovered(null)}
          className={cn('relative inline-flex h-9 w-9 items-center justify-center rounded-full text-2xl transition-transform hover:scale-125 hover:-translate-y-1 active:scale-90')}
          title={r.label}
        >
          <span className={cn('transition-transform', hovered === r.type ? 'scale-110' : '')}>{r.emoji}</span>
        </button>
      ))}
    </div>
  );
}
