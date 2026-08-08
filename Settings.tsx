import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { Avatar } from '@/components/Avatar';
import { Heart, MessageCircle, UserPlus, Bell, Link2, Check, X, ThumbsUp, Share2, Mail, PhoneMissed, AtSign, Tag } from 'lucide-react';
import { fullName, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Notification } from '@/types';

const ICONS: Record<Notification['type'], { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: 'bg-red-50 text-red-500' },
  comment: { icon: MessageCircle, color: 'bg-sky-50 text-sky-500' },
  follow: { icon: UserPlus, color: 'bg-grape-50 text-grape-500' },
  mention: { icon: AtSign, color: 'bg-amber-50 text-amber-500' },
  connection_request: { icon: Link2, color: 'bg-brand-50 text-brand-600' },
  connection_accepted: { icon: Check, color: 'bg-emerald-50 text-emerald-500' },
  reaction: { icon: ThumbsUp, color: 'bg-purple-50 text-purple-500' },
  share: { icon: Share2, color: 'bg-teal-50 text-teal-500' },
  message: { icon: Mail, color: 'bg-sky-50 text-sky-500' },
  reply: { icon: MessageCircle, color: 'bg-sky-50 text-sky-500' },
  tag: { icon: Tag, color: 'bg-amber-50 text-amber-500' },
  missed_call: { icon: PhoneMissed, color: 'bg-red-50 text-red-500' },
};

export function Notifications() {
  const { currentUser, notifications, markNotificationsRead, getUserById, respondToConnectionRequest, connectionRequests } = useApp();
  const { navigate } = useRouter();

  useEffect(() => {
    const t = setTimeout(markNotificationsRead, 800);
    return () => clearTimeout(t);
  }, [markNotificationsRead]);

  if (!currentUser) return null;
  const mine = notifications.filter((n) => n.userId === currentUser.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-strong">Notificaciones</h1>
        {mine.some((n) => !n.read) && (
          <button onClick={markNotificationsRead} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20">
            <Check size={15} /> Marcar todas como le\u00eddas
          </button>
        )}
      </div>

      {mine.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Bell size={26} />
          </div>
          <h3 className="font-display text-lg font-bold text-strong">No tienes notificaciones</h3>
          <p className="max-w-sm text-sm text-muted">Cuando alguien interactúe contigo, lo verás aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map((n) => {
            const actor = getUserById(n.actorId);
            if (!actor) return null;
            const meta = ICONS[n.type];
            const Icon = meta.icon;
            const isConnReq = n.type === 'connection_request' && connectionRequests.find((r) => r.id === n.connectionRequestId && r.status === 'pending');
            return (
              <div
                key={n.id}
                className={cn(
                  'card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-soft',
                  !n.read && 'border-brand-300 bg-brand-50/60 dark:border-brand-700/40 dark:bg-brand-900/20',
                )}
              >
                <button onClick={() => navigate({ name: 'profile', userId: actor.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className="relative">
                    <Avatar user={actor} size={44} />
                    <span className={cn('absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white', meta.color)}>
                      <Icon size={13} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-app">
                      <span className="font-semibold text-strong">{fullName(actor)}</span> {n.text}.
                    </p>
                    <p className="text-xs text-muted">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
                {isConnReq && (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => respondToConnectionRequest(n.connectionRequestId!, true)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:bg-emerald-600">
                      <Check size={16} />
                    </button>
                    <button onClick={() => respondToConnectionRequest(n.connectionRequestId!, false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--vex-surface-2)] text-muted transition hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                )}
                {!n.read && !isConnReq && <span className="h-2.5 w-2.5 shrink-0 rounded-full gradient-brand" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
