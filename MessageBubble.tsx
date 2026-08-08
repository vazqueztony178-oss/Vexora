import { Mic, X, Pause, Play, Check, Lock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onSend: (blob: Blob, url: string, duration: number) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'locked';

export function VoiceRecorder({ onSend, onRecordingStateChange }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [showLockHint, setShowLockHint] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onRecordingStateChange?.(state === 'recording' || state === 'paused' || state === 'locked');
  }, [state, onRecordingStateChange]);

  useEffect(() => () => {
    cleanup();
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setState('idle');
    }
  };

  const stopAndSend = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') { resetAll(); return; }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      onSend(blob, url, duration);
      cleanup();
    };
    mr.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setState('idle');
    setDuration(0);
    setDragX(0);
  };

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = null;
      mr.stop();
    }
    cleanup();
    setState('idle');
    setDuration(0);
    setDragX(0);
  };

  const pauseRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr?.state === 'recording') {
      mr.pause();
      setState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr?.state === 'paused') {
      mr.resume();
      setState('recording');
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  };

  const resetAll = () => {
    setState('idle');
    setDuration(0);
    setDragX(0);
    cleanup();
  };

  const handlePressStart = (e: React.PointerEvent) => {
    if (state === 'locked' || state === 'paused') return;
    pressStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setShowLockHint(true);
    startRecording();
  };

  const handlePressMove = (e: React.PointerEvent) => {
    if (!pressStartRef.current || state !== 'recording') return;
    const dx = e.clientX - pressStartRef.current.x;
    setDragX(Math.max(0, Math.min(dx, 80)));
    if (dx > 70) {
      setState('locked');
      setShowLockHint(false);
      pressStartRef.current = null;
    }
  };

  const handlePressEnd = () => {
    if (state === 'locked') {
      pressStartRef.current = null;
      setShowLockHint(false);
      return;
    }
    if (state === 'recording') {
      if (dragX > 40) {
        cancelRecording();
      } else {
        stopAndSend();
      }
    }
    pressStartRef.current = null;
    setShowLockHint(false);
    setDragX(0);
  };

  if (state === 'idle') {
    return (
      <button
        onPointerDown={handlePressStart}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-[var(--vex-surface-2)] hover:text-brand-500"
        title="Mantener para grabar audio"
      >
        <Mic size={20} />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-1 items-center gap-2">
      {/* Recording / paused / locked states */}
      {(state === 'recording' || state === 'paused' || state === 'locked') && (
        <>
          <button
            onClick={cancelRecording}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500 transition hover:bg-red-500/20"
          >
            <Trash2 size={17} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className={cn(
              'inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
              state === 'recording' ? 'animate-pulse bg-red-500' : state === 'paused' ? 'bg-amber-500' : 'bg-red-500',
            )} />
            <span className="shrink-0 text-sm font-semibold text-app">
              {state === 'recording' ? 'Grabando' : state === 'paused' ? 'Pausado' : 'Grabando'}
            </span>
            <span className="shrink-0 font-mono text-sm font-bold text-app">{formatDuration(duration)}</span>

            {state === 'locked' && (
              <div className="flex h-7 flex-1 items-center justify-end gap-1.5 overflow-hidden">
                <button
                  onClick={pauseRecording}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--vex-surface-2)] text-app transition hover:bg-[var(--vex-border)]"
                >
                  <Pause size={14} />
                </button>
                <button
                  onClick={resumeRecording}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--vex-surface-2)] text-app transition hover:bg-[var(--vex-border)]"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={stopAndSend}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-white"
                >
                  <Check size={14} />
                </button>
              </div>
            )}
          </div>

          {state === 'recording' && !showLockHint && dragX === 0 && (
            <span className="shrink-0 text-[10px] text-muted">← Desliza para cancelar</span>
          )}

          {state === 'recording' && dragX > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <X size={14} /> Cancelar
            </div>
          )}

          {state === 'paused' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={resumeRecording}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--vex-surface-2)] text-app transition hover:bg-[var(--vex-border)]"
              >
                <Play size={15} />
              </button>
              <button
                onClick={stopAndSend}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-white"
              >
                <Check size={15} />
              </button>
            </div>
          )}

          {(state === 'recording') && (
            <button
              onClick={pauseRecording}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--vex-surface-2)] text-app transition hover:bg-[var(--vex-border)]"
            >
              <Pause size={17} />
            </button>
          )}

          {(state === 'recording') && (
            <button
              onClick={stopAndSend}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-brand text-white"
            >
              <Check size={17} />
            </button>
          )}
        </>
      )}

      {showLockHint && state === 'recording' && dragX < 20 && (
        <div className="pointer-events-none absolute -top-9 right-0 flex items-center gap-1 rounded-lg bg-[var(--vex-surface)] px-2 py-1 text-[10px] text-muted shadow-card">
          <Lock size={11} /> Desliza para bloquear
        </div>
      )}
    </div>
  );
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
