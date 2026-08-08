import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { dbUpdatePresence, dbFetchAllPresence } from '@/lib/db';
import type { PresenceInfo } from '@/types';

interface PresenceRecord {
  is_online: boolean;
  last_seen_at: string;
  show_online_status: boolean;
}

function toInfo(rec: PresenceRecord | null): PresenceInfo | null {
  if (!rec) return null;
  return {
    isOnline: rec.is_online,
    lastSeenAt: new Date(rec.last_seen_at).getTime(),
    showOnlineStatus: rec.show_online_status ?? true,
  };
}

export function usePresence(myUserId: string | null, showOnlineStatus: boolean) {
  const [presence, setPresence] = useState<Record<string, PresenceInfo>>({});
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set self online and start heartbeat
  useEffect(() => {
    if (!myUserId) return;
    const sb = getSupabase();
    if (!sb) return;

    const goOnline = async () => {
      await dbUpdatePresence(myUserId, true, showOnlineStatus);
    };

    const goOffline = async () => {
      await dbUpdatePresence(myUserId, false, showOnlineStatus);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') goOnline();
      else goOffline();
    };

    goOnline();
    heartbeatRef.current = setInterval(goOnline, 20_000);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', goOffline);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [myUserId, showOnlineStatus]);

  // Subscribe to presence changes for all users
  useEffect(() => {
    if (!myUserId) return;
    const sb = getSupabase();
    if (!sb) return;

    const loadInitial = async () => {
      const map = await dbFetchAllPresence();
      setPresence(map);
    };

    loadInitial();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = sb.channel('presence-all')
      .on('postgres_changes' as any,
        { event: '*', schema: 'public', table: 'presence' },
        (payload: any) => {
          const row = payload.new as PresenceRecord & { user_id: string };
          if (!row) return;
          setPresence((prev) => {
            const info = toInfo(row);
            if (!info) return prev;
            return { ...prev, [row.user_id]: info };
          });
        },
      )
      .subscribe();

    return () => {
      try { sb.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [myUserId]);

  const getPresence = useCallback((userId: string): PresenceInfo | null => {
    return presence[userId] ?? null;
  }, [presence]);

  const updateShowOnlineStatus = useCallback(async (show: boolean) => {
    if (!myUserId) return;
    await dbUpdatePresence(myUserId, true, show);
  }, [myUserId]);

  return { presence, getPresence, updateShowOnlineStatus };
}
