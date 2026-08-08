import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface AudioPlayerProps {
  src: string;
  duration: number;
  mine: boolean;
}

const SPEEDS = [1, 1.5, 2];

export function AudioPlayer({ src, duration, mine }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [maxTime, setMaxTime] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      if (!isFinite(audio.duration) || isNaN(audio.duration)) {
        setMaxTime(duration);
      } else {
        setMaxTime(audio.duration);
      }
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [duration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * maxTime;
    setCurrentTime(audio.currentTime);
  };

  const progress = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;
  const bars = generateWaveform(maxTime, 36);

  return (
    <div className={cn('flex items-center gap-2.5 py-1', mine ? 'text-white' : 'text-app')}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={toggle}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
          mine ? 'bg-white/20 hover:bg-white/30' : 'bg-brand-500 text-white hover:bg-brand-600',
        )}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          onClick={seek}
          className="flex h-7 cursor-pointer items-center gap-0.5"
        >
          {bars.map((h, i) => {
            const barProgress = ((i + 1) / bars.length) * 100;
            const played = barProgress <= progress;
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-colors',
                  played
                    ? (mine ? 'bg-white/80' : 'bg-brand-500')
                    : (mine ? 'bg-white/25' : 'bg-[var(--vex-border)]'),
                )}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className={cn('flex items-center justify-between text-[10px]', mine ? 'text-white/60' : 'text-muted')}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(maxTime)}</span>
        </div>
      </div>

      <button
        onClick={cycleSpeed}
        className={cn(
          'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition',
          mine ? 'bg-white/15 text-white/80 hover:bg-white/25' : 'bg-[var(--vex-surface-2)] text-muted hover:text-app',
        )}
      >
        {speed}x
      </button>
    </div>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function generateWaveform(duration: number, count: number): number[] {
  const bars: number[] = [];
  const seed = Math.floor(duration * 7) + 3;
  for (let i = 0; i < count; i++) {
    const x = Math.sin(seed * i * 0.37) * Math.cos(seed * i * 0.13);
    const h = 8 + Math.abs(x) * 18 + (i % 3) * 2;
    bars.push(Math.min(h, 26));
  }
  return bars;
}

export { Volume2 };
