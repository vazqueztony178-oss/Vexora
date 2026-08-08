import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Volume2,
  UserPlus, MessageSquare, Smile, RotateCcw, Monitor, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/Avatar';
import { fullName } from '@/lib/format';
import { webrtc } from '@/lib/webrtc';
import { QUICK_REACTIONS } from '@/lib/emoji';
import type { User, CallType, CallStatus, CallSignal } from '@/types';

interface CallOverlayProps {
  user: User;
  type: CallType;
  myUserId: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onClose: (endedStatus: CallStatus) => void;
}

export function CallOverlay({ user, type, myUserId, isIncoming = false, onAccept, onClose }: CallOverlayProps) {
  const [status, setStatus] = useState<CallStatus>(isIncoming ? 'ringing' : 'calling');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState<{ emoji: string; id: number } | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startRef = useRef<number>(0);
  const callIdRef = useRef<string>(`call_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionCounterRef = useRef(0);

  const callId = callIdRef.current;

  const endCall = useCallback((finalStatus: CallStatus = 'ended') => {
    webrtc.sendCallEnd();
    webrtc.close();
    setStatus(finalStatus);
    setTimeout(() => onClose(finalStatus), 600);
  }, [onClose]);

  const setupMedia = useCallback(async (callType: CallType): Promise<MediaStream | null> => {
    try {
      const stream = await webrtc.getLocalStream(callType);
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Permiso denegado';
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
        setPermissionError('No se pudo acceder a la cámara o el micrófono. Revisa los permisos del navegador.');
      } else {
        setPermissionError(`Error: ${msg}`);
      }
      return null;
    }
  }, []);

  const handleSignal = useCallback(async (signal: CallSignal) => {
    if (signal.type === 'call-accept' && signal.callId === callId) {
      setStatus('connecting');
      const stream = await setupMedia(type);
      if (!stream) { endCall('ended'); return; }
      await webrtc.createPeer(true, stream);
      setStatus('in_call');
      startRef.current = Date.now();
    } else if (signal.type === 'call-reject') {
      endCall('declined');
    } else if (signal.type === 'call-end') {
      endCall('ended');
    } else if (signal.type === 'call-unanswered') {
      endCall('unanswered');
    } else if (signal.type === 'answer' && signal.sdp) {
      setStatus('in_call');
      startRef.current = Date.now();
    } else if (signal.type === 'media-state' && signal.mediaState) {
      setRemoteMuted(signal.mediaState.muted);
      setRemoteCameraOff(signal.mediaState.cameraOff);
    }
  }, [callId, type, setupMedia, endCall]);

  useEffect(() => {
    webrtc.subscribe(myUserId);
    webrtc.joinCall(callId, user.id);
    const unsub = webrtc.onSignal(handleSignal);

    if (!isIncoming) {
      webrtc.sendCallStart(type);
      ringTimerRef.current = setTimeout(() => {
        if (status === 'calling') {
          webrtc.sendCallEnd();
          endCall('unanswered');
        }
      }, 30000);
    }

    return () => {
      unsub();
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkRemote = setInterval(() => {
      const remote = webrtc.getRemoteStream();
      if (remote && remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remote) {
          remoteVideoRef.current.srcObject = remote;
        }
        if (remote.getAudioTracks().length > 0 && audioRef.current && !audioRef.current.srcObject) {
          audioRef.current.srcObject = remote;
          audioRef.current.play().catch(() => {});
        }
      }
    }, 500);
    return () => clearInterval(checkRemote);
  }, []);

  useEffect(() => {
    if (status !== 'in_call') return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleAccept = useCallback(async () => {
    if (onAccept) { onAccept(); return; }
    const stream = await setupMedia(type);
    if (!stream) { endCall('ended'); return; }
    webrtc.sendCallAccept();
    await webrtc.createPeer(false, stream);
    setStatus('in_call');
    startRef.current = Date.now();
  }, [onAccept, type, setupMedia, endCall]);

  const handleReject = useCallback(() => {
    webrtc.sendCallReject();
    webrtc.close();
    setStatus('declined');
    setTimeout(() => onClose('declined'), 600);
  }, [onClose]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    webrtc.toggleMute(next);
    webrtc.sendMediaState(next, cameraOff);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    webrtc.toggleCamera(next);
    webrtc.sendMediaState(muted, next);
  };

  const switchCamera = async () => {
    const stream = await webrtc.switchCamera();
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const startScreenShare = async () => {
    await webrtc.startScreenShare();
    if (localVideoRef.current) {
      const local = webrtc.getRemoteStream();
      if (local) localVideoRef.current.srcObject = local;
    }
  };

  const sendReaction = (emoji: string) => {
    reactionCounterRef.current += 1;
    setFloatingReaction({ emoji, id: reactionCounterRef.current });
    setTimeout(() => setFloatingReaction(null), 3000);
    setShowReactions(false);
  };

  const statusLabel = (() => {
    switch (status) {
      case 'calling': return 'Llamando...';
      case 'ringing': return 'Sonando...';
      case 'connecting': return 'Conectando...';
      case 'in_call': return 'En llamada';
      case 'declined': return 'Llamada rechazada';
      case 'unanswered': return 'Llamada sin respuesta';
      case 'missed': return 'Llamada perdida';
      case 'ended': return 'Finalizando...';
      default: return 'Llamando...';
    }
  })();

  const isVideo = type === 'video';
  const showAvatar = !isVideo || cameraOff || remoteCameraOff || status !== 'in_call';

  if (permissionError) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#030712]/95 p-6 backdrop-blur-xl">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <VideoOff size={28} />
          </div>
          <h2 className="mb-2 font-display text-lg font-bold text-white">Permisos requeridos</h2>
          <p className="mb-6 text-sm text-white/60">{permissionError}</p>
          <button
            onClick={() => endCall('ended')}
            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Incoming call screen
  if (isIncoming && status === 'ringing') {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#030712]/95 backdrop-blur-xl animate-scale-in">
        <div className="absolute inset-0 opacity-30" style={{
          background: 'radial-gradient(60% 50% at 50% 30%, rgba(37, 99, 235, 0.3) 0%, transparent 60%)',
        }} />

        <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-brand-400">
          {isVideo ? 'Videollamada' : 'Llamada'} entrante
        </p>

        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" />
          <div className="absolute -inset-4 animate-pulse rounded-full bg-brand-500/10" />
          <Avatar user={user} size={120} />
        </div>

        <div className="mt-4 text-center">
          <h2 className="font-display text-2xl font-bold text-white">{fullName(user)}</h2>
          <p className="text-sm text-white/50">@{user.username}</p>
        </div>

        <div className="mt-10 flex items-center gap-6">
          <button
            onClick={handleReject}
            className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 active:scale-95"
          >
            <PhoneOff size={26} />
          </button>
          <button
            onClick={handleAccept}
            className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition hover:bg-green-700 active:scale-95"
          >
            {isVideo ? <Video size={26} /> : <Phone size={26} />}
          </button>
        </div>

        <audio ref={audioRef} loop autoPlay className="hidden">
          <source src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" type="audio/wav" />
        </audio>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#030712] animate-scale-in">
      {/* Remote video / avatar */}
      <div className="relative flex-1 overflow-hidden">
        {isVideo && !showAvatar && status === 'in_call' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="relative">
              {status === 'calling' || status === 'ringing' ? (
                <>
                  <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" />
                  <div className="absolute -inset-4 animate-pulse rounded-full bg-brand-500/10" />
                </>
              ) : null}
              <Avatar user={user} size={isVideo ? 140 : 120} />
            </div>
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-white">{fullName(user)}</h2>
              <p className="text-sm text-white/50">@{user.username}</p>
            </div>
          </div>
        )}

        {/* Gradient overlay for controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Status bar */}
        <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isVideo ? <Video size={14} className="text-brand-400" /> : <Phone size={14} className="text-brand-400" />}
            <span className={cn('text-sm font-semibold', status === 'in_call' ? 'text-green-400' : 'text-white/80')}>
              {statusLabel}
              {status === 'in_call' && ` · ${formatElapsed(elapsed)}`}
            </span>
          </div>
        </div>

        {/* Floating reaction */}
        {floatingReaction && (
          <div
            key={floatingReaction.id}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 animate-float-up text-5xl"
          >
            {floatingReaction.emoji}
          </div>
        )}

        {/* Local video preview (picture-in-picture) */}
        {isVideo && status === 'in_call' && !cameraOff && (
          <div className="absolute right-4 top-16 h-36 w-28 overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg sm:h-44 sm:w-32 md:right-6 md:top-20 md:h-48 md:w-36">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
          </div>
        )}

        {/* Remote media indicators */}
        {status === 'in_call' && (remoteMuted || remoteCameraOff) && (
          <div className="absolute left-4 top-20 flex flex-col gap-1.5">
            {remoteMuted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
                <MicOff size={10} /> Silenciado
              </span>
            )}
            {remoteCameraOff && isVideo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
                <VideoOff size={10} /> Cámara off
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hidden audio for remote audio-only calls */}
      {!isVideo && <audio ref={audioRef} autoPlay className="hidden" />}

      {/* Controls bar */}
      <div className="relative z-10 flex items-center justify-center gap-2 p-4 pb-8 sm:gap-3 sm:p-6 sm:pb-10">
        {status === 'in_call' ? (
          <>
            <CallButton active={muted} onClick={toggleMute} activeClass="bg-white text-black" title="Micrófono">
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </CallButton>

            {isVideo && (
              <CallButton active={cameraOff} onClick={toggleCamera} activeClass="bg-white text-black" title="Cámara">
                {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </CallButton>
            )}

            <CallButton active={speakerOn} onClick={() => setSpeakerOn((s) => !s)} title="Altavoz">
              <Volume2 size={20} />
            </CallButton>

            {isVideo && (
              <>
                <CallButton onClick={switchCamera} title="Cambiar cámara">
                  <RotateCcw size={20} />
                </CallButton>
                <CallButton onClick={startScreenShare} title="Compartir pantalla">
                  <Monitor size={20} />
                </CallButton>
              </>
            )}

            <CallButton active={showChat} onClick={() => setShowChat((s) => !s)} title="Chat">
              <MessageSquare size={20} />
            </CallButton>

            <CallButton active={showReactions} onClick={() => setShowReactions((s) => !s)} title="Reacciones">
              <Smile size={20} />
            </CallButton>

            <CallButton onClick={() => { /* add participant */ }} title="Agregar">
              <UserPlus size={20} />
            </CallButton>

            <button
              onClick={() => endCall('ended')}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 active:scale-95"
            >
              <PhoneOff size={22} />
            </button>
          </>
        ) : (
          <button
            onClick={() => endCall('ended')}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 active:scale-95"
          >
            <PhoneOff size={22} />
          </button>
        )}
      </div>

      {/* Reactions panel */}
      {showReactions && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-1 rounded-full border border-app bg-[var(--vex-surface)] p-2 shadow-card">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:scale-125 hover:bg-[var(--vex-surface-2)]"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat sidebar during call */}
      {showChat && (
        <div className="absolute right-0 top-0 z-20 h-full w-72 border-l border-app bg-[var(--vex-surface)] p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-strong">Chat</h3>
            <button onClick={() => setShowChat(false)} className="text-muted hover:text-app">
              <X size={18} />
            </button>
          </div>
          <div className="flex h-[calc(100%-4rem)] items-center justify-center text-center text-sm text-muted">
            <p>Los mensajes del chat aparecerán aquí durante la llamada.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CallButton({
  children, onClick, active, activeClass, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 sm:h-12 sm:w-12',
        active
          ? (activeClass ?? 'bg-brand-500 text-white')
          : 'bg-white/10 text-white hover:bg-white/20',
      )}
    >
      {children}
    </button>
  );
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
