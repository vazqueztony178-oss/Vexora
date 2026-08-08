import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { Avatar } from '@/components/Avatar';
import { PostCard } from '@/components/PostCard';
import {
  Search as SearchIcon, Users, FileText, X, MapPin, UserPlus,
  MessageCircle, UserCheck, Loader2, BadgeCheck, UserRound,
  Sparkles, Radio, Clock,
} from 'lucide-react';
import { fullName } from '@/lib/format';
import { getUserStatus, statusDotClass, lastSeenLabel, isUserOnline } from '@/lib/status';
import { cn } from '@/lib/cn';
import type { User, PresenceInfo } from '@/types';
import {
  fetchAllProfiles, searchProfiles, profileToUser, type ProfileRow,
} from '@/lib/profiles';

type FilterKey = 'people' | 'friends' | 'connected' | 'nearby' | 'new' | 'verified';

const FILTERS: Array<{ key: FilterKey; label: string; icon: typeof Users }> = [
  { key: 'people', label: 'Personas', icon: Users },
  { key: 'friends', label: 'Amigos', icon: UserRound },
  { key: 'connected', label: 'Conectados', icon: UserCheck },
  { key: 'nearby', label: 'Cercanos', icon: Radio },
  { key: 'new', label: 'Nuevos', icon: Sparkles },
  { key: 'verified', label: 'Verificados', icon: BadgeCheck },
];

const PAGE_SIZE = 12;

export function SearchPage() {
  const {
    users, posts, currentUser,
    getPresenceInfo, getConnectionStatus,
    sendConnectionRequest,
    getConversation,
  } = useApp();
  const { navigate } = useRouter();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'usuarios' | 'publicaciones'>('usuarios');
  const [filter, setFilter] = useState<FilterKey>('people');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);

  // Fetch all profiles from the shared Supabase table on mount and when refreshed.
  useEffect(() => {
    let cancelled = false;
    setLoadingProfiles(true);
    fetchAllProfiles()
      .then((rows) => { if (!cancelled) setProfiles(rows); })
      .finally(() => { if (!cancelled) setLoadingProfiles(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Merge local users (richer data: followers, following, presence, etc.) with
  // remote profiles. Local users take priority; remote-only profiles become User
  // objects via profileToUser so the search can find users from other devices.
  const mergedUsers = useMemo<User[]>(() => {
    const localById = new Map(users.map((u) => [u.id, u]));
    const result: User[] = [...users];
    for (const p of profiles) {
      if (!localById.has(p.id)) result.push(profileToUser(p));
    }
    return result;
  }, [users, profiles]);

  const q = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!currentUser) return [];
    let list = mergedUsers.filter((u) => u.id !== currentUser.id);

    if (q) {
      const localMap = new Map(users.map((u) => [u.id, u]));
      list = searchProfiles(
        mergedUsers.map((u) => ({
          id: u.id,
          first_name: u.firstName,
          last_name: u.lastName,
          username: u.username,
          email: u.email,
          alt_email: u.altEmail ?? '',
          phone: u.phone ?? '',
          bio: u.bio ?? '',
          avatar_url: u.avatarUrl ?? '',
          cover_url: u.coverUrl ?? '',
          verified: u.verified,
          created_at: new Date(u.createdAt).toISOString(),
        })),
        query,
        currentUser.id,
      ).map((row) => {
        const local = localMap.get(row.id);
        return local ?? profileToUser(row);
      });
    }

    switch (filter) {
      case 'friends':
        list = list.filter((u) => currentUser.following.includes(u.id));
        break;
      case 'connected':
        list = list.filter((u) => getConnectionStatus(u.id) === 'connected');
        break;
      case 'new':
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'verified':
        list = list.filter((u) => u.verified);
        break;
      case 'nearby':
        list = list.filter((u) => {
          const myCity = currentUser.profileInfo?.city?.toLowerCase();
          const theirCity = u.profileInfo?.city?.toLowerCase();
          return myCity && theirCity && myCity === theirCity;
        });
        break;
      case 'people':
      default:
        break;
    }

    return list;
  }, [mergedUsers, currentUser, q, filter, getConnectionStatus, query]);

  const matchedPosts = useMemo(
    () => (q ? posts.filter((p) => p.text.toLowerCase().includes(q)) : []),
    [posts, q],
  );

  const visibleUsers = filteredUsers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredUsers.length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, filter, tab]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    requestAnimationFrame(() => {
      setVisibleCount((c) => c + PAGE_SIZE);
      setLoadingMore(false);
    });
  }, [loadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, tab]);

  const handleMessage = (userId: string) => {
    void getConversation(userId);
    navigate({ name: 'messages' });
  };

  if (!currentUser) return null;

  return (
    <div ref={scrollRootRef} className="mx-auto max-w-5xl px-4 py-6">
      {/* Search bar */}
      <div className="card p-4">
        <div className="relative">
          <SearchIcon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca personas o publicaciones..."
            className="input pl-11 pr-11"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-strong">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {([
            { key: 'usuarios', label: 'Usuarios', icon: Users, count: filteredUsers.length },
            { key: 'publicaciones', label: 'Publicaciones', icon: FileText, count: matchedPosts.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === t.key ? 'gradient-brand text-white shadow-soft' : 'bg-[var(--vex-surface-2)] text-app hover:bg-[var(--vex-border)]',
              )}
            >
              <t.icon size={16} /> {t.label}
              {q && <span className="rounded-full bg-white/20 px-1.5 text-xs">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Filter chips — only for users tab */}
      {tab === 'usuarios' && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                filter === f.key
                  ? 'gradient-brand border-transparent text-white shadow-soft'
                  : 'border-app bg-[var(--vex-surface)] text-muted hover:bg-[var(--vex-surface-2)] hover:text-strong',
              )}
            >
              <f.icon size={14} /> {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-5 space-y-3">
        {!q && tab === 'usuarios' && filter === 'people' && (
          <div className="card p-10 text-center text-muted">
            Escribe arriba para buscar usuarios y publicaciones en Vexora.
          </div>
        )}

        {tab === 'usuarios' && (q || filter !== 'people') && (
          <>
            {loadingProfiles && !q ? (
              <div className="card flex items-center justify-center gap-2 p-10 text-muted">
                <Loader2 size={20} className="animate-spin" /> Cargando usuarios...
              </div>
            ) : visibleUsers.length === 0 ? (
              <div className="card p-10 text-center text-muted">
                {q
                  ? `No encontramos usuarios para «${query}».`
                  : 'No hay usuarios en este filtro por ahora.'}
              </div>
            ) : (
              <>
                {/* Card grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleUsers.map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      currentUserId={currentUser.id}
                      presence={getPresenceInfo(u.id)}
                      connectionStatus={getConnectionStatus(u.id)}
                      onConnect={() => sendConnectionRequest(u.id)}
                      onMessage={() => handleMessage(u.id)}
                      onViewProfile={() => navigate({ name: 'profile', userId: u.id })}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-6 text-muted">
                    {loadingMore ? (
                      <span className="inline-flex items-center gap-2 text-sm">
                        <Loader2 size={16} className="animate-spin" /> Cargando más...
                      </span>
                    ) : (
                      <span className="text-xs">Desplázate para ver más</span>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'publicaciones' && (
          <>
            {!q ? (
              <div className="card p-10 text-center text-muted">
                Escribe algo para buscar publicaciones.
              </div>
            ) : matchedPosts.length === 0 ? (
              <div className="card p-10 text-center text-muted">No hay publicaciones para «{query}».</div>
            ) : (
              matchedPosts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UserCard({
  user,
  currentUserId,
  presence,
  connectionStatus,
  onConnect,
  onMessage,
  onViewProfile,
}: {
  user: User;
  currentUserId: string;
  presence: PresenceInfo | null;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  onConnect: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
}) {
  const status = getUserStatus(user, currentUserId, presence);
  const isOnline = isUserOnline(user, currentUserId, presence);
  const lastSeen = lastSeenLabel(user, currentUserId, presence);

  const statusText = status === 'online' ? 'Activo ahora' : status === 'away' ? 'Ausente' : lastSeen || 'Desconectado';

  const city = user.profileInfo?.city;
  const country = user.profileInfo?.country;
  const location = [city, country].filter(Boolean).join(', ');

  return (
    <div className="card group animate-fade-up p-4 transition hover:shadow-soft">
      {/* Top: avatar + identity */}
      <div className="flex items-start gap-3">
        <button onClick={onViewProfile} className="relative shrink-0">
          <Avatar user={user} size={56} />
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--vex-surface)]',
              statusDotClass(status),
            )}
          />
        </button>

        <div className="min-w-0 flex-1">
          <button onClick={onViewProfile} className="flex items-center gap-1 text-left">
            <p className="truncate font-semibold text-strong group-hover:text-brand-600 dark:group-hover:text-brand-400">
              {fullName(user)}
            </p>
            {user.verified && (
              <BadgeCheck size={15} className="shrink-0 text-brand-500" />
            )}
          </button>
          <p className="truncate text-sm text-muted">@{user.username}</p>

          {/* Status */}
          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'inline-block h-2 w-2 shrink-0 rounded-full',
                status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-amber-400' : 'bg-slate-400',
              )}
            />
            <span className={cn('truncate', isOnline ? 'font-medium text-green-600 dark:text-green-400' : 'text-muted')}>
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="mt-3 line-clamp-2 text-sm text-app">{user.bio}</p>
      )}

      {/* Location */}
      {location && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Stats */}
      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="text-muted">
          <span className="font-semibold text-strong">{user.following.length}</span> amigos
        </span>
        <span className="text-muted">
          <span className="font-semibold text-strong">{user.followers.length}</span> seguidores
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {connectionStatus === 'connected' ? (
          <>
            <button
              onClick={onMessage}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5 py-2 text-sm"
            >
              <MessageCircle size={15} /> Mensaje
            </button>
            <button
              onClick={onViewProfile}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-app bg-[var(--vex-surface)] px-3 py-2 text-sm font-semibold text-app transition hover:bg-[var(--vex-surface-2)]"
            >
              <UserCheck size={15} className="text-green-500" /> Conectados
            </button>
          </>
        ) : connectionStatus === 'pending_sent' ? (
          <button
            disabled
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--vex-surface-2)] py-2 text-sm font-semibold text-muted"
          >
            <Clock size={15} /> Solicitud enviada
          </button>
        ) : connectionStatus === 'pending_received' ? (
          <button
            onClick={onConnect}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
          >
            <UserPlus size={15} /> Responder solicitud
          </button>
        ) : (
          <>
            <button
              onClick={onConnect}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5 py-2 text-sm"
            >
              <UserPlus size={15} /> Conectar
            </button>
            <button
              onClick={onViewProfile}
              className="inline-flex items-center justify-center rounded-xl border border-app bg-[var(--vex-surface)] px-3 py-2 text-sm font-semibold text-app transition hover:bg-[var(--vex-surface-2)]"
            >
              Ver perfil
            </button>
          </>
        )}
      </div>
    </div>
  );
}
