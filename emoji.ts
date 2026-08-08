import type { User, UserStatus, PresenceInfo } from '@/types';

const ACTIVE_THRESHOLD_MS = 60_000;

export function isUserOnline(user: User | undefined | null, currentUserId: string | null, presence?: PresenceInfo | null): boolean {
  if (!user || !currentUserId) return false;
  if (user.id === currentUserId) return true;
  if (presence) {
    if (!presence.showOnlineStatus) return false;
    return presence.isOnline;
  }
  const now = Date.now();
  const last = user.lastActiveAt ?? 0;
  return now - last <= ACTIVE_THRESHOLD_MS;
}

export function getUserStatus(user: User | undefined | null, currentUserId: string | null, presence?: PresenceInfo | null): UserStatus {
  if (!user || !currentUserId) return 'offline';
  if (user.id === currentUserId) return 'online';
  if (presence) {
    if (!presence.showOnlineStatus) return 'offline';
    return presence.isOnline ? 'online' : 'offline';
  }
  const now = Date.now();
  const last = user.lastActiveAt ?? 0;
  if (now - last > ACTIVE_THRESHOLD_MS) return 'offline';
  return 'online';
}

export function lastSeenLabel(user: User | undefined | null, currentUserId: string | null, presence?: PresenceInfo | null): string {
  if (!user || !currentUserId) return '';
  if (user.id === currentUserId) return '';
  if (presence && presence.showOnlineStatus && presence.isOnline) return 'En línea';
  const last = presence?.lastSeenAt ?? user.lastSeenAt ?? user.lastActiveAt ?? 0;
  if (!last) return 'Desconectado';
  const diff = Date.now() - last;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'últ. vez hace un momento';
  if (m < 60) return `Activo hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Activo hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Activo hace ${d} d`;
  return `últ. vez ${new Date(last).toLocaleDateString('es', { day: '2-digit', month: 'short' })}`;
}

export function statusLabel(status: UserStatus): string {
  switch (status) {
    case 'online': return 'En línea';
    case 'offline': return 'Desconectado';
    case 'away': return 'No disponible';
    case 'typing': return 'Escribiendo...';
    case 'recording': return 'Grabando audio...';
    default: return 'Desconectado';
  }
}

export function statusDotClass(status: UserStatus): string {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'typing': return 'bg-green-500 animate-pulse';
    case 'recording': return 'bg-red-500 animate-pulse';
    case 'offline': return 'bg-slate-500';
    default: return 'bg-slate-500';
  }
}
