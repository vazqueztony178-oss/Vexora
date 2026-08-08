import { useState, useRef, useEffect } from 'react';
import {
  Check, CheckCheck, Reply, Forward, Copy, Trash2, Pencil, SmilePlus,
  MoreHorizontal, FileText, Play, Download, Plus,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { QUICK_REACTIONS } from '@/lib/emoji';
import { EMOJI_CATEGORIES } from '@/lib/emoji';
import { attachmentLabel, attachmentColor, formatFileSize } from '@/lib/attachments';
import { AudioPlayer } from '@/components/AudioPlayer';
import type { Message, User, Attachment } from '@/types';
import { fullName } from '@/lib/format';
import { Avatar } from '@/components/Avatar';

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  sender: User | null;
  replyTo?: Message | null;
  forwardedFrom?: User | null;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
  onPreviewAttachment?: (a: Attachment) => void;
}

function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\s)+$/u;
  return emojiRegex.test(trimmed) && [...trimmed].length <= 6;
}

export function MessageBubble({
  message, mine, sender, replyTo, forwardedFrom,
  onReply, onForward, onCopy, onDelete, onEdit, onReact, onPreviewAttachment,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showFullEmoji, setShowFullEmoji] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    if (!showMenu && !showReactions && !showFullEmoji) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowReactions(false);
        setShowFullEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler as EventListener);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler as EventListener);
    };
  }, [showMenu, showReactions, showFullEmoji]);

  const startLongPress = () => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowReactions(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (message.deleted) {
    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm italic', mine ? 'bg-brand-900/30 text-white/50' : 'bg-[var(--vex-surface-2)] text-muted')}>
          Mensaje eliminado
        </div>
      </div>
    );
  }

  const reactions = message.reactions ?? [];
  const reactionGroups = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  const emojiOnly = !message.attachment && message.text ? isEmojiOnly(message.text) : false;

  return (
    <div
      className={cn('group relative flex flex-col', mine ? 'items-end' : 'items-start')}
      ref={menuRef}
    >
      {/* Bubble — align-self via items-end/items-start on parent */}
      <div
        onContextMenu={(e) => { e.preventDefault(); setShowReactions(true); }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerMove={cancelLongPress}
        onPointerLeave={cancelLongPress}
        style={{
          width: 'fit-content',
          minWidth: '64px',
          maxWidth: '82%',
          whiteSpace: 'pre-wrap',
          wordBreak: 'normal',
          overflowWrap: 'break-word',
        }}
        className={cn(
          'touch-none select-none rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[68%]',
          emojiOnly && 'px-4 py-2',
          mine ? 'gradient-brand text-white' : 'bg-[var(--vex-surface-2)] text-app',
        )}
      >
        {forwardedFrom && (
          <div className={cn('mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', mine ? 'text-white/60' : 'text-muted')}>
            <Forward size={11} /> Reenviado de {forwardedFrom.id === sender?.id ? 'ti' : fullName(forwardedFrom)}
          </div>
        )}

        {replyTo && !replyTo.deleted && (
          <div className={cn('mb-1.5 rounded-lg border-l-2 pl-2 pr-1 py-1 text-xs', mine ? 'border-white/50 bg-white/10' : 'border-brand-400 bg-brand-50/50 dark:bg-brand-900/20')}>
            <p className={cn('font-semibold', mine ? 'text-white/80' : 'text-brand-600 dark:text-brand-400')}>
              {replyTo.senderId === sender?.id ? 'Tú' : fullName(sender ?? { firstName: '', lastName: '', username: '' } as User)}
            </p>
            <p className={cn('truncate', mine ? 'text-white/60' : 'text-muted')}>{replyTo.text || (replyTo.attachment ? attachmentLabel(replyTo.attachment.type) : '')}</p>
          </div>
        )}

        {message.attachment && <AttachmentPreview attachment={message.attachment} mine={mine} onPreview={onPreviewAttachment} />}

        {message.text && (
          <p
            className={cn(emojiOnly ? 'text-4xl leading-tight' : 'leading-relaxed')}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'normal', overflowWrap: 'break-word' }}
          >
            {message.text}
          </p>
        )}

        {/* Timestamp — always single line, bottom-right inside bubble */}
        <div
          className={cn(
            'mt-0.5 flex items-center justify-end gap-1 text-[10px]',
            emojiOnly ? 'mt-1' : '',
            mine ? 'text-white/60' : 'text-muted',
          )}
          style={{ whiteSpace: 'nowrap', flexShrink: 0, flexWrap: 'nowrap' }}
        >
          {message.editedAt && <span style={{ whiteSpace: 'nowrap' }} className="italic">editado</span>}
          {message.attachment?.type === 'audio' && <span style={{ whiteSpace: 'nowrap' }} className="mr-1">Nota de voz</span>}
          <span style={{ whiteSpace: 'nowrap' }}>{formatTime(message.createdAt)}</span>
          {mine && <StatusTicks message={message} />}
        </div>
      </div>

      {/* Reactions badge */}
      {reactions.length > 0 && (
        <div className={cn('mt-0.5 flex gap-0.5 rounded-full border border-app bg-[var(--vex-surface)] px-1.5 py-0.5 text-xs shadow-sm', mine ? 'self-end' : 'self-start')}>
          {Object.entries(reactionGroups).map(([emoji, count]) => (
            <span key={emoji} className="flex items-center gap-0.5">
              {emoji}{count > 1 && <span className="text-[9px] font-bold text-muted">{count}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Hover action buttons — positioned outside bubble flow */}
      <div className={cn('absolute top-0 -translate-y-full flex gap-0.5 opacity-0 transition group-hover:opacity-100', mine ? 'right-0' : 'left-0')}>
        <button
          onClick={() => setShowReactions((v) => !v)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted bg-[var(--vex-surface)] shadow-sm transition hover:bg-[var(--vex-surface-2)]"
        >
          <SmilePlus size={15} />
        </button>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted bg-[var(--vex-surface)] shadow-sm transition hover:bg-[var(--vex-surface-2)]"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {showReactions && (
        <div className={cn('absolute z-50 flex items-center gap-1 rounded-full border border-app bg-[var(--vex-surface)] p-1.5 shadow-card', mine ? 'right-8' : 'left-8', '-top-9')}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(emoji); setShowReactions(false); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:scale-125 hover:bg-[var(--vex-surface-2)]"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => { setShowFullEmoji(true); setShowReactions(false); }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:scale-125 hover:bg-[var(--vex-surface-2)]"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {showFullEmoji && (
        <div className={cn('absolute z-50 max-h-64 w-72 overflow-y-auto rounded-2xl border border-app bg-[var(--vex-surface)] p-2 shadow-card', mine ? 'right-8' : 'left-8', '-top-64')}>
          <div className="grid grid-cols-7 gap-0.5">
            {EMOJI_CATEGORIES.flatMap((c) => c.emojis).map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => { onReact(emoji); setShowFullEmoji(false); }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-[var(--vex-surface-2)]"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className={cn('absolute z-50 w-44 animate-scale-in overflow-hidden rounded-xl border border-app bg-[var(--vex-surface)] py-1 shadow-card', mine ? 'right-8' : 'left-8', 'top-4')}>
            <MenuBtn icon={Reply} label="Responder" onClick={() => { onReply(); setShowMenu(false); }} />
            <MenuBtn icon={Forward} label="Reenviar" onClick={() => { onForward(); setShowMenu(false); }} />
            <MenuBtn icon={Copy} label="Copiar" onClick={() => { onCopy(); setShowMenu(false); }} />
            {mine && message.text && <MenuBtn icon={Pencil} label="Editar" onClick={() => { onEdit(); setShowMenu(false); }} />}
            {mine && <MenuBtn icon={Trash2} label="Eliminar" danger onClick={() => { onDelete(); setShowMenu(false); }} />}
          </div>
        </>
      )}
    </div>
  );
}

function StatusTicks({ message }: { message: Message }) {
  if (message.status === 'read') {
    return <CheckCheck size={13} className="text-sky-400" style={{ flexShrink: 0 }} />;
  }
  if (message.status === 'delivered') {
    return <CheckCheck size={13} className="text-white/60" style={{ flexShrink: 0 }} />;
  }
  return <Check size={13} className="text-white/60" style={{ flexShrink: 0 }} />;
}

function MenuBtn({ icon: Icon, label, onClick, danger }: { icon: typeof Reply; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition',
        danger ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30' : 'text-app hover:bg-[var(--vex-surface-2)]',
      )}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function AttachmentPreview({ attachment, mine, onPreview }: { attachment: Attachment; mine: boolean; onPreview?: (a: Attachment) => void }) {
  if (attachment.type === 'image') {
    return (
      <img
        src={attachment.dataUrl}
        alt={attachment.name}
        onClick={() => onPreview?.(attachment)}
        className="mb-1.5 max-h-60 w-full cursor-pointer rounded-lg object-cover"
        style={{ maxWidth: '280px' }}
      />
    );
  }
  if (attachment.type === 'video') {
    return (
      <div className="mb-1.5 overflow-hidden rounded-lg bg-black/50">
        <video src={attachment.dataUrl} controls className="max-h-48 w-full" preload="metadata" style={{ maxWidth: '280px' }} />
      </div>
    );
  }
  if (attachment.type === 'audio') {
    const dur = (attachment as Attachment & { duration?: number }).duration ?? 0;
    return (
      <div className="mb-1 min-w-[200px]">
        <AudioPlayer src={attachment.dataUrl} duration={dur} mine={mine} />
      </div>
    );
  }
  return (
    <a
      href={attachment.dataUrl}
      download={attachment.name}
      className={cn('mb-1.5 flex items-center gap-2.5 rounded-lg border p-2.5 transition', mine ? 'border-white/20 bg-white/10' : 'border-app bg-[var(--vex-surface)]')}
      style={{ minWidth: '180px' }}
    >
      <div className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', mine ? 'bg-white/15' : 'bg-[var(--vex-surface-2)]', attachmentColor(attachment.type))}>
        <FileText size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-xs font-semibold', mine ? 'text-white' : 'text-strong')}>{attachment.name}</p>
        <p className={cn('text-[10px]', mine ? 'text-white/60' : 'text-muted')}>
          {attachmentLabel(attachment.type)} · {formatFileSize(attachment.size)}
        </p>
      </div>
      <Download size={16} className={cn('shrink-0', mine ? 'text-white/70' : 'text-muted')} />
    </a>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
