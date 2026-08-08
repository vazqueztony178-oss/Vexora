@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: light;
    /* === TEMA CLARO === */
    --vex-bg: #F7F9FC;
    --vex-surface: #FFFFFF;
    --vex-surface-2: #F8FAFC;
    --vex-text: #0F172A;
    --vex-text-strong: #0F172A;
    --vex-muted: #64748B;
    --vex-border: #E2E8F0;
    --vex-border-soft: #F1F5F9;
    --vex-header: #FFFFFF;
    --vex-sidebar: #F8FAFC;
    --vex-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px -4px rgba(15,23,42,0.08);
    --vex-overlay: rgba(15, 23, 42, 0.5);
    /* === Vexora identity (fixed) === */
    --vex-accent: #2563EB;
    --vex-accent-2: #7C3AED;
    --vex-accent-cyan: #00A8FF;
    --vex-accent-hover: #1d4ed8;
    --vex-accent-soft: rgba(37, 99, 235, 0.10);
    --vex-accent-border: rgba(37, 99, 235, 0.35);
    --vex-accent-glow: 0 0 16px -4px rgba(37, 99, 235, 0.45);
    --vex-gradient: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
    --vex-gradient-bright: linear-gradient(135deg, #00A8FF 0%, #2563EB 50%, #A855F7 100%);
  }

  html.dark {
    color-scheme: dark;
    /* === TEMA OSCURO === */
    --vex-bg: #020617;
    --vex-surface: #071426;
    --vex-surface-2: #0B1A30;
    --vex-text: #F8FAFC;
    --vex-text-strong: #F8FAFC;
    --vex-muted: #94A3B8;
    --vex-border: #1E293B;
    --vex-border-soft: #162136;
    --vex-header: #020617;
    --vex-sidebar: #030B18;
    --vex-shadow: 0 18px 48px -12px rgba(0, 0, 0, 0.5);
    --vex-overlay: rgba(2, 6, 23, 0.7);
    /* === Vexora identity (fixed) === */
    --vex-accent: #3b82f6;
    --vex-accent-2: #8b5cf6;
    --vex-accent-cyan: #00A8FF;
    --vex-accent-hover: #2563eb;
    --vex-accent-soft: rgba(59, 130, 246, 0.15);
    --vex-accent-border: rgba(59, 130, 246, 0.35);
    --vex-accent-glow: 0 0 16px -4px rgba(59, 130, 246, 0.45);
    --vex-gradient: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
    --vex-gradient-bright: linear-gradient(135deg, #00A8FF 0%, #2563EB 50%, #A855F7 100%);
  }

  /* === LIQUID GLASS === */
  /* Glass uses the resolved light/dark palette as its base, then overlays
     translucent surfaces, blur, inner highlights and soft glows.
     --vex-glass-blur and --vex-glass-sat are set dynamically by ThemeContext
     based on the selected intensity (soft / medium / intense). */
  html.vex-glass {}
  html.vex-glass:not(.dark) {
    --vex-bg: #EEF2F8;
    --vex-surface: rgba(255, 255, 255, 0.55);
    --vex-surface-2: rgba(255, 255, 255, 0.40);
    --vex-header: rgba(255, 255, 255, 0.55);
    --vex-sidebar: rgba(248, 250, 252, 0.55);
    --vex-border: rgba(148, 163, 184, 0.28);
    --vex-border-soft: rgba(148, 163, 184, 0.18);
    --vex-shadow: 0 8px 32px -8px rgba(37, 99, 235, 0.18), 0 2px 8px -2px rgba(15, 23, 42, 0.08);
    --vex-overlay: rgba(15, 23, 42, 0.30);
    --vex-accent-soft: rgba(37, 99, 235, 0.14);
    --vex-accent-glow: 0 0 24px -6px rgba(0, 168, 255, 0.40);
  }
  html.vex-glass.dark {
    --vex-bg: #050A16;
    --vex-surface: rgba(10, 22, 44, 0.55);
    --vex-surface-2: rgba(14, 28, 52, 0.45);
    --vex-header: rgba(8, 16, 34, 0.55);
    --vex-sidebar: rgba(6, 14, 30, 0.55);
    --vex-border: rgba(99, 130, 200, 0.20);
    --vex-border-soft: rgba(99, 130, 200, 0.12);
    --vex-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.6), 0 0 24px -10px rgba(59, 130, 246, 0.25);
    --vex-overlay: rgba(2, 6, 23, 0.55);
    --vex-accent-soft: rgba(59, 130, 246, 0.18);
    --vex-accent-glow: 0 0 28px -6px rgba(0, 168, 255, 0.45);
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
  }

  body {
    @apply font-sans antialiased;
    background-color: var(--vex-bg);
    color: var(--vex-text);
  }

  /* Liquid Glass ambient background — subtle aurora behind everything */
  html.vex-glass body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(50% 60% at 18% 22%, rgba(0, 168, 255, 0.20) 0%, transparent 60%),
      radial-gradient(45% 55% at 82% 18%, rgba(124, 58, 237, 0.18) 0%, transparent 60%),
      radial-gradient(55% 70% at 50% 100%, rgba(37, 99, 235, 0.16) 0%, transparent 65%);
  }
  html.vex-glass:not(.dark) body::before {
    background:
      radial-gradient(50% 60% at 18% 22%, rgba(0, 168, 255, 0.14) 0%, transparent 60%),
      radial-gradient(45% 55% at 82% 18%, rgba(124, 58, 237, 0.12) 0%, transparent 60%),
      radial-gradient(55% 70% at 50% 100%, rgba(37, 99, 235, 0.10) 0%, transparent 65%);
  }

  * {
    border-color: var(--vex-border);
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none;
  }
  .btn-primary {
    @apply btn text-white active:scale-[0.98];
    background-image: var(--vex-gradient);
  }
  .btn-primary:hover {
    background-image: var(--vex-gradient-bright);
  }
  .btn-ghost {
    @apply btn border bg-[var(--vex-surface)] text-[var(--vex-text-strong)] hover:bg-[var(--vex-surface-2)];
    border-color: var(--vex-border);
  }
  .btn-soft {
    @apply btn active:scale-[0.98];
    background-color: var(--vex-accent-soft);
    color: var(--vex-accent);
  }
  .btn-soft:hover {
    background-color: var(--vex-accent-border);
  }
  .btn-danger {
    @apply btn bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98];
  }

  .input {
    @apply w-full rounded-xl border px-4 py-2.5 outline-none transition-all duration-200;
    background-color: var(--vex-surface);
    border-color: var(--vex-border);
    color: var(--vex-text-strong);
    @apply placeholder-slate-400 focus:ring-4;
  }
  .input:focus {
    border-color: var(--vex-accent);
  }
  .input:focus-visible {
    --tw-ring-color: var(--vex-accent-soft);
  }
  html.dark .input {
    --tw-ring-color: var(--vex-accent-soft);
  }

  .label {
    @apply block text-sm font-semibold mb-1.5;
    color: var(--vex-text);
  }

  .card {
    @apply rounded-2xl border;
    background-color: var(--vex-surface);
    border-color: var(--vex-border);
    box-shadow: var(--vex-shadow);
  }

  .surface {
    background-color: var(--vex-surface);
  }
  .surface-2 {
    background-color: var(--vex-surface-2);
  }
  .text-app {
    color: var(--vex-text);
  }
  .text-strong {
    color: var(--vex-text-strong);
  }
  .text-muted {
    color: var(--vex-muted);
  }
  .border-app {
    border-color: var(--vex-border);
  }
  .border-soft {
    border-color: var(--vex-border-soft);
  }

  .gradient-brand {
    background-image: var(--vex-gradient);
  }
  .gradient-brand:hover {
    background-image: var(--vex-gradient-bright);
  }
  .gradient-aurora {
    background-image:
      radial-gradient(60% 80% at 15% 20%, rgba(99, 102, 241, 0.35) 0%, transparent 60%),
      radial-gradient(50% 70% at 85% 15%, rgba(168, 85, 247, 0.30) 0%, transparent 60%),
      radial-gradient(60% 80% at 50% 100%, rgba(14, 165, 233, 0.25) 0%, transparent 60%);
  }

  /* === LIQUID GLASS surfaces === */
  html.vex-glass .card,
  html.vex-glass .surface,
  html.vex-glass .vex-panel,
  html.vex-glass .vex-panel-light {
    backdrop-filter: blur(var(--vex-glass-blur)) saturate(var(--vex-glass-sat));
    -webkit-backdrop-filter: blur(var(--vex-glass-blur)) saturate(var(--vex-glass-sat));
    box-shadow:
      var(--vex-shadow),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
      inset 0 -1px 0 0 rgba(255, 255, 255, 0.05);
  }
  html.vex-glass.dark .card,
  html.vex-glass.dark .surface,
  html.vex-glass.dark .vex-panel,
  html.vex-glass.dark .vex-panel-light {
    box-shadow:
      var(--vex-shadow),
      inset 0 1px 0 0 rgba(160, 190, 255, 0.10),
      inset 0 -1px 0 0 rgba(0, 168, 255, 0.04);
  }

  /* Liquid Glass header / sidebar / top bar — also glassy */
  html.vex-glass header,
  html.vex-glass .vex-glass-bar {
    backdrop-filter: blur(var(--vex-glass-blur)) saturate(var(--vex-glass-sat));
    -webkit-backdrop-filter: blur(var(--vex-glass-blur)) saturate(var(--vex-glass-sat));
  }

  /* Buttons get a subtle glass sheen in glass mode */
  html.vex-glass .btn-primary {
    box-shadow:
      0 8px 24px -8px rgba(37, 99, 235, 0.50),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.25);
  }

  /* === Vexora dark theme landing === */
  .vex-dark-gradient {
    background:
      radial-gradient(70% 50% at 20% 0%, rgba(37, 99, 235, 0.18) 0%, transparent 55%),
      radial-gradient(60% 50% at 85% 10%, rgba(124, 58, 237, 0.20) 0%, transparent 55%),
      radial-gradient(90% 70% at 50% 110%, rgba(0, 168, 255, 0.16) 0%, transparent 60%),
      #030712;
  }
  .vex-light-gradient {
    background:
      radial-gradient(70% 50% at 20% 0%, rgba(37, 99, 235, 0.10) 0%, transparent 55%),
      radial-gradient(60% 50% at 85% 10%, rgba(124, 58, 237, 0.12) 0%, transparent 55%),
      radial-gradient(90% 70% at 50% 110%, rgba(0, 168, 255, 0.10) 0%, transparent 60%),
      #f4f6fb;
  }
  .vex-panel {
    @apply rounded-2xl border border-white/10 bg-[#071426]/90 backdrop-blur-xl;
  }
  .vex-panel-light {
    @apply rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-xl shadow-card;
  }
  .vex-gradient-text {
    @apply text-transparent bg-clip-text;
    background-image: linear-gradient(100deg, #00A8FF 0%, #2563EB 45%, #A855F7 100%);
  }
  .vex-gradient-bg {
    background-image: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
  }
  .vex-gradient-bg-bright {
    background-image: linear-gradient(135deg, #00A8FF 0%, #2563EB 50%, #A855F7 100%);
  }
  .vex-border-gradient {
    border-image: linear-gradient(135deg, rgba(0,168,255,0.5), rgba(168,85,247,0.5)) 1;
  }
  .vex-glow-blue {
    box-shadow: 0 0 28px -8px rgba(0, 168, 255, 0.6);
  }
  .vex-glow-purple {
    box-shadow: 0 0 28px -8px rgba(168, 85, 247, 0.6);
  }
  .vex-glow-btn {
    box-shadow: 0 12px 36px -10px rgba(124, 58, 237, 0.7), 0 0 0 1px rgba(255,255,255,0.06) inset;
  }

  /* === Vexora logo === */
  .vex-logo-glow {
    filter: drop-shadow(0 0 6px rgba(0, 212, 255, 0.55)) drop-shadow(0 0 12px rgba(168, 85, 247, 0.35));
    transition: filter 0.3s ease, transform 0.3s ease;
  }
  .vex-logo-hover:hover .vex-logo-glow {
    filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.8)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.6));
  }
  .vex-logo-hover:hover .vex-logo-mark {
    transform: scale(1.06);
  }
  html:not(.dark) .vex-logo-glow {
    filter: drop-shadow(0 0 3px rgba(37, 99, 235, 0.25));
  }
  html:not(.dark) .vex-logo-hover:hover .vex-logo-glow {
    filter: drop-shadow(0 0 6px rgba(37, 99, 235, 0.45));
  }
}

@layer utilities {
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .no-tap { -webkit-tap-highlight-color: transparent; }
  .text-balance { text-wrap: balance; }
  @keyframes vex-scale-in {
    from { opacity: 0; transform: scale(0.95) translateY(4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes vex-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes vex-slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-scale-in { animation: vex-scale-in 0.18s ease-out; }
  .animate-slide-in { animation: vex-slide-in 0.22s ease-out; }
  @keyframes vex-slide-in { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .animate-fade-up { animation: vex-fade-up 0.3s ease-out; }
  .animate-slide-up { animation: vex-slide-up 0.25s ease-out; }

  @keyframes vex-float-up {
    0% { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
    20% { opacity: 1; transform: translate(-50%, -20px) scale(1.2); }
    100% { opacity: 0; transform: translate(-50%, -120px) scale(1); }
  }
  .animate-float-up { animation: vex-float-up 3s ease-out forwards; }

  .vex-range {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 999px;
    background: var(--vex-border);
    outline: none;
  }
  .vex-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--vex-gradient);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
    border: 2px solid var(--vex-surface);
  }
  .vex-range::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--vex-gradient);
    cursor: pointer;
    border: 2px solid var(--vex-surface);
  }
}
