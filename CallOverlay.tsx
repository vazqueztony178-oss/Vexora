import { cn } from '@/lib/cn';

const V_GRADIENT_ID = 'vexora-v-gradient';
const EARTH_GRADIENT_ID = 'vexora-earth-gradient';

function VMark({ size, glow = true }: { size: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="Vexora"
      className={cn(glow && 'vex-logo-glow')}
    >
      <defs>
        <linearGradient id={V_GRADIENT_ID} x1="14" y1="16" x2="86" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF" />
          <stop offset="0.45" stopColor="#2563EB" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <radialGradient id={EARTH_GRADIENT_ID} cx="0.38" cy="0.32" r="0.78">
          <stop stopColor="#38bdf8" />
          <stop offset="0.55" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <filter id="vexora-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* V shape — two converging strokes */}
      <g filter="url(#vexora-soft-glow)">
        <path
          d="M20 18 L50 80"
          stroke={`url(#${V_GRADIENT_ID})`}
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M80 18 L50 80"
          stroke={`url(#${V_GRADIENT_ID})`}
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>

      {/* Orbital ring around the planet, tilted */}
      <ellipse
        cx="50"
        cy="62"
        rx="23"
        ry="9"
        transform="rotate(-24 50 62)"
        stroke={`url(#${V_GRADIENT_ID})`}
        strokeWidth="2.4"
        opacity="0.85"
      />

      {/* Planet Earth — integrated in lower/center of the V */}
      <circle cx="50" cy="62" r="13" fill={`url(#${EARTH_GRADIENT_ID})`} />
      {/* Continents — stylized abstract land masses */}
      <path
        d="M43 58.5c2.6-1.6 5.2-1 7 .2 1.7 1.2 3.4 1 5.4-.4 1.4-1 3-.8 4.2.1"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M45.5 66c2-1.4 4.2-1 6 .3 1.6 1.1 3.3.7 4.8-.4"
        stroke="#16a34a"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      {/* Specular highlight */}
      <circle cx="45.5" cy="57.5" r="3.6" fill="#ffffff" opacity="0.28" />
    </svg>
  );
}

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn('vex-logo-hover relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <VMark size={size} />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display font-extrabold tracking-tight text-transparent bg-clip-text',
        'bg-gradient-to-r from-sky-500 via-brand-600 to-grape-500',
        className,
      )}
    >
      Vexora
    </span>
  );
}

export function FullLogo({
  size = 44,
  showTagline = true,
  className,
}: {
  size?: number;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex flex-col items-center', className)}>
      <span className="flex items-center gap-2.5">
        <VMark size={size} />
        <Wordmark className="text-2xl" />
      </span>
      {showTagline && (
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
          Una comunidad para todos
        </span>
      )}
    </span>
  );
}
