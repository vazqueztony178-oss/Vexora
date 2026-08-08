import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { Link2, MessageCircle, Send, X, Copy, Check } from 'lucide-react';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Post } from '@/types';

interface ShareModalProps {
  post: Post;
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ post, open, onClose }: ShareModalProps) {
  const { currentUser, users, getUserById, sharePost, conversations, getConversation, sendMessage } = useApp();
  const { navigate } = useRouter();
  const [copied, setCopied] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [search, setSearch] = useState('');

  if (!open || !currentUser) return null;

  const author = getUserById(post.userId);
  const postUrl = `${window.location.origin}/?post=${post.id}`;
  const shareText = author ? `${fullName(author)} compartió: ${post.text.slice(0, 100)}` : post.text.slice(0, 120);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const shareOnVexora = () => {
    sharePost(post.id);
    onClose();
  };

    const sendToUser = async (userId: string) => {
    const conv = conversations.find((c) => c.participantIds.includes(userId));
    if (conv) {
      sendMessage(conv.id, postUrl);
    } else {
      const newConv = await getConversation(userId);
      sendMessage(newConv.id, postUrl);
    }
    setMsgOpen(false);
    onClose();
    navigate({ name: 'messages' });
  };

  const friends = users.filter(
    (u) => currentUser.following.includes(u.id) && u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const socialLinks = [
    { name: 'WhatsApp', icon: 'M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z', color: 'bg-emerald-500' },
    { name: 'Facebook', icon: 'M24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 6 4.4 11 10.1 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4C19.6 23 24 18 24 12z', color: 'bg-blue-600' },
    { name: 'X', icon: 'M18.9 2H22l-7.5 8.6L23.2 22h-6.8l-5.3-7-6.1 7H2l8-9.2L1.5 2h7l4.8 6.4L18.9 2zm-2.4 18h1.9L7.6 4H5.6l10.9 16z', color: 'bg-slate-900' },
    { name: 'Telegram', icon: 'M23.9 4.6L20.3 21c-.3 1.2-.9 1.5-1.9.9l-5.2-3.8-2.5 2.4c-.3.3-.5.5-1 .5l.3-5.2 9.5-8.6c.4-.4-.1-.6-.6-.2L6.7 13.5l-5-1.6c-1.1-.3-1.1-1.1.2-1.6l19.5-7.5c.9-.3 1.7.2 1.5 1.8z', color: 'bg-sky-500' },
    { name: 'Correo', icon: 'M2 4h20v16H2V4zm10 7L4 6v12l8-5zm0 0l8 5V6l-8 5z', color: 'bg-brand-600' },
  ];

  const openSocial = (name: string) => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(postUrl);
    const links: Record<string, string> = {
      'WhatsApp': `https://wa.me/?text=${text}%20${url}`,
      'Facebook': `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      'X': `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      'Telegram': `https://t.me/share/url?url=${url}&text=${text}`,
      'Correo': `mailto:?subject=${encodeURIComponent('Mira esta publicación de Vexora')}&body=${text}%0A%0A${url}`,
    };
    window.open(links[name], '_blank', 'noopener,noreferrer');
  };

  const internalActions = [
    { name: 'Compartir en Vexora', icon: Send, color: 'text-brand-600 dark:text-brand-400', onClick: shareOnVexora },
    { name: 'Copiar enlace', icon: copied ? Check : Link2, color: copied ? 'text-emerald-500' : 'text-sky-500', onClick: copyLink },
    { name: 'Enviar por mensaje', icon: MessageCircle, color: 'text-grape-500', onClick: () => setMsgOpen(true) },
  ];

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--vex-overlay)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md animate-scale-in rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-soft p-4">
          <h2 className="font-display text-lg font-bold text-strong">Compartir publicación</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-[var(--vex-surface-2)]">
            <X size={18} />
          </button>
        </div>

        {!msgOpen ? (
          <div className="p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Compartir en Vexora</p>
            <div className="grid grid-cols-3 gap-2">
              {internalActions.map((a) => (
                <button
                  key={a.name}
                  onClick={a.onClick}
                  className="flex flex-col items-center gap-2 rounded-xl border border-app p-3 transition hover:bg-[var(--vex-surface-2)]"
                >
                  <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vex-surface-2)]', a.color)}>
                    <a.icon size={20} />
                  </span>
                  <span className="text-center text-[11px] font-semibold text-app leading-tight">{a.name}</span>
                </button>
              ))}
            </div>

            {copied && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Copy size={15} /> Enlace copiado al portapapeles
              </div>
            )}

            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted">Compartir en otras redes</p>
            <div className="grid grid-cols-5 gap-2">
              {socialLinks.map((s) => (
                <button
                  key={s.name}
                  onClick={() => openSocial(s.name)}
                  title={s.name}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className={cn('inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:scale-105', s.color)}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={s.icon} /></svg>
                  </span>
                  <span className="text-[10px] font-medium text-muted">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <button onClick={() => setMsgOpen(false)} className="text-sm font-semibold text-brand-600 dark:text-brand-400">← Atrás</button>
              <h3 className="text-sm font-bold text-strong">Enviar a…</h3>
            </div>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar amigo…"
              className="input mb-3 text-sm"
            />
            {friends.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No tienes amigos para enviar el mensaje.</p>
            ) : (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => sendToUser(f.id)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[var(--vex-surface-2)]"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                      <Send size={15} />
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-strong">{fullName(f)}</span>
                    <span className="text-xs text-muted">@{f.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
