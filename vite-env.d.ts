import { useState, useRef, useCallback } from 'react';
import { RotateCw, FlipHorizontal2, FlipVertical2, Sun, Contrast, Droplets, Thermometer, Zap, Crop, RotateCcw, Check, X, ZoomIn, Aperture, Sparkles, AlertCircle, Move, Eye, Layers, SunMedium, Palette, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ImageEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  title?: string;
  aspectRatio?: 'free' | 'square' | 'cover';
}

interface Adjustments {
  zoom: number;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  sharpness: number;
  blur: number;
  shadows: number;
  highlights: number;
  exposure: number;
  intensity: number;
  tint: number;
  bw: number;
}

interface Transform {
  rotate: number;
  flipH: boolean;
  flipV: boolean;
}

const DEFAULT_ADJ: Adjustments = {
  zoom: 100, brightness: 100, contrast: 100, saturation: 100, temperature: 0,
  sharpness: 0, blur: 0, shadows: 0, highlights: 0, exposure: 0, intensity: 100, tint: 0, bw: 0,
};
const DEFAULT_TF: Transform = { rotate: 0, flipH: false, flipV: false };

const FILTERS: Array<{ name: string; preview: string }> = [
  { name: 'Original', preview: 'none' },
  { name: 'Vexora', preview: 'brightness(1.05) contrast(1.08) saturate(1.15) sepia(0.05)' },
  { name: 'Cálido', preview: 'brightness(1.02) saturate(1.1) sepia(0.15)' },
  { name: 'Frío', preview: 'brightness(1.02) saturate(1.05) hue-rotate(-12deg)' },
  { name: 'Nostalgia', preview: 'sepia(0.35) contrast(1.05) brightness(1.03)' },
  { name: 'B/N', preview: 'grayscale(1) contrast(1.1)' },
  { name: 'Sepia', preview: 'sepia(0.8) brightness(1.05) contrast(1.05)' },
  { name: 'Vintage', preview: 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.85) hue-rotate(-8deg)' },
  { name: 'Vívido', preview: 'saturate(1.4) contrast(1.1)' },
  { name: 'Suave', preview: 'brightness(1.06) contrast(0.95) saturate(0.95)' },
  { name: 'HDR', preview: 'contrast(1.25) saturate(1.3) brightness(1.02)' },
  { name: 'Artístico', preview: 'saturate(1.5) contrast(1.15) hue-rotate(15deg) brightness(1.03)' },
  { name: 'Iluminación', preview: 'brightness(1.15) contrast(1.05) saturate(1.1)' },
];

interface SliderDef {
  key: keyof Adjustments;
  label: string;
  icon: typeof Sun;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  mid?: number;
}

const SLIDER_GROUPS: Array<{ title: string; icon: typeof Sun; sliders: SliderDef[] }> = [
  {
    title: 'Básicos', icon: Sun,
    sliders: [
      { key: 'brightness', label: 'Brillo', icon: Sun, min: 40, max: 180, mid: 100 },
      { key: 'contrast', label: 'Contraste', icon: Contrast, min: 40, max: 180, mid: 100 },
      { key: 'saturation', label: 'Saturación', icon: Droplets, min: 0, max: 200, mid: 100 },
      { key: 'temperature', label: 'Temperatura', icon: Thermometer, min: -40, max: 40, mid: 0, suffix: '°' },
    ],
  },
  {
    title: 'Detalle', icon: SlidersHorizontal,
    sliders: [
      { key: 'sharpness', label: 'Nitidez', icon: Zap, min: 0, max: 100 },
      { key: 'blur', label: 'Desenfoque', icon: Aperture, min: 0, max: 20, step: 1 },
      { key: 'shadows', label: 'Sombras', icon: SunMedium, min: 0, max: 100 },
      { key: 'highlights', label: 'Luces', icon: Sun, min: 0, max: 100 },
    ],
  },
  {
    title: 'Color', icon: Palette,
    sliders: [
      { key: 'exposure', label: 'Exposición', icon: Sun, min: -100, max: 100, mid: 0 },
      { key: 'intensity', label: 'Intensidad', icon: Droplets, min: 0, max: 200, mid: 100, suffix: '%' },
      { key: 'tint', label: 'Tinte', icon: Palette, min: -100, max: 100, mid: 0, suffix: '°' },
      { key: 'bw', label: 'Blanco y negro', icon: Contrast, min: 0, max: 100, suffix: '%' },
    ],
  },
];

type Tab = 'crop' | 'adjust' | 'filters';

const MAX_OUTPUT = 600;

export function ImageEditor({ src, onSave, onCancel, title = 'Editor de imagen', aspectRatio = 'free' }: ImageEditorProps) {
  const [tab, setTab] = useState<Tab>('crop');
  const [adj, setAdj] = useState<Adjustments>(DEFAULT_ADJ);
  const [tf, setTf] = useState<Transform>(DEFAULT_TF);
  const [activeFilter, setActiveFilter] = useState(0);
  const [cropMode, setCropMode] = useState<'idle' | 'drawing' | 'done'>('idle');
  const [cropRect, setCropRect] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [peekOriginal, setPeekOriginal] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const buildCssFilter = useCallback((useOriginal = false) => {
    if (useOriginal) return 'none';
    const parts: string[] = [];
    if (adj.brightness !== 100) parts.push(`brightness(${adj.brightness / 100})`);
    if (adj.exposure !== 0) parts.push(`brightness(${1 + adj.exposure / 100})`);
    if (adj.shadows > 0) {
      parts.push(`brightness(${1 + adj.shadows * 0.003})`);
      parts.push(`contrast(${1 - adj.shadows * 0.0015})`);
    }
    if (adj.highlights > 0) {
      parts.push(`brightness(${1 - adj.highlights * 0.002})`);
      parts.push(`contrast(${1 + adj.highlights * 0.0015})`);
    }
    if (adj.contrast !== 100) parts.push(`contrast(${adj.contrast / 100})`);
    if (adj.saturation !== 100) parts.push(`saturate(${adj.saturation / 100})`);
    if (adj.intensity !== 100) parts.push(`saturate(${adj.intensity / 100})`);
    if (adj.bw > 0) parts.push(`grayscale(${adj.bw / 100})`);
    if (adj.blur > 0) parts.push(`blur(${adj.blur}px)`);
    if (adj.temperature !== 0) {
      if (adj.temperature > 0) parts.push(`sepia(${adj.temperature / 100}) saturate(1.2)`);
      else parts.push(`hue-rotate(${adj.temperature}deg) saturate(1.1)`);
    }
    if (adj.tint !== 0) parts.push(`hue-rotate(${adj.tint * 0.3}deg)`);
    if (activeFilter !== 0) parts.push(FILTERS[activeFilter].preview);
    return parts.length ? parts.join(' ') : 'none';
  }, [adj, activeFilter]);

  const isOriginal = showOriginal || peekOriginal;

  const reset = () => {
    setAdj(DEFAULT_ADJ);
    setTf(DEFAULT_TF);
    setActiveFilter(0);
    setCropRect(null);
    setCropMode('idle');
    setPan({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!imgLoaded) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setAdj((p) => ({ ...p, zoom: Math.max(100, Math.min(300, p.zoom + delta)) }));
  };

  const constrainSquare = (rect: { sx: number; sy: number; ex: number; ey: number }) => {
    if (aspectRatio !== 'square') return rect;
    const w = Math.abs(rect.ex - rect.sx);
    const h = Math.abs(rect.ey - rect.sy);
    const side = Math.max(w, h);
    const cx = (rect.sx + rect.ex) / 2;
    const cy = (rect.sy + rect.ey) / 2;
    return { sx: cx - side / 2, sy: cy - side / 2, ex: cx + side / 2, ey: cy + side / 2 };
  };

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (tab === 'crop') {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCropRect(constrainSquare({ sx: x, sy: y, ex: x, ey: y }));
      setCropMode('drawing');
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (adj.zoom <= 100) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    if (cropMode === 'drawing' && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      setCropRect((prev) => prev ? constrainSquare({ ...prev, ex: x, ey: y }) : prev);
      return;
    }
    if (isPanning) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y),
      });
    }
  };

  const onStagePointerUp = () => {
    if (cropMode === 'drawing') setCropMode('done');
    setIsPanning(false);
  };

  const renderPreview = () => {
    const cssFilter = buildCssFilter(isOriginal);
    const transforms: string[] = [];
    if (tf.rotate) transforms.push(`rotate(${tf.rotate}deg)`);
    if (tf.flipH) transforms.push('scaleX(-1)');
    if (tf.flipV) transforms.push('scaleY(-1)');
    if (adj.zoom > 100) transforms.push(`scale(${adj.zoom / 100})`);
    transforms.push(`translate(${pan.x}px, ${pan.y}px)`);

    const canPan = adj.zoom > 100 && tab !== 'crop' && !isOriginal;

    return (
      <div
        ref={stageRef}
        className="relative flex items-center justify-center overflow-hidden rounded-xl bg-[var(--vex-surface-2)]"
        style={{ minHeight: 280, height: '100%' }}
        onWheel={onWheel}
      >
        {imgError ? (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <AlertCircle size={40} className="text-red-500" />
            <p className="text-sm font-semibold text-strong">No se pudo cargar la imagen</p>
            <p className="text-xs text-muted">Verifica que el archivo sea válido e inténtalo de nuevo.</p>
          </div>
        ) : !imgLoaded ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-app border-t-brand-500" />
            <p className="text-xs text-muted">Cargando imagen…</p>
          </div>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center" style={{ touchAction: 'none' }}>
            <img
              ref={imgRef}
              src={src}
              alt=""
              className="max-h-full max-w-full select-none rounded-xl object-contain transition-[filter] duration-150"
              style={{
                filter: cssFilter,
                transform: transforms.join(' ') || undefined,
                cursor: canPan ? (isPanning ? 'grabbing' : 'grab') : tab === 'crop' ? 'crosshair' : 'default',
              }}
              draggable={false}
            />
            {tab === 'crop' && !isOriginal && (
              <div
                ref={overlayRef}
                className="absolute inset-0 cursor-crosshair"
                onPointerDown={onStagePointerDown}
                onPointerMove={onStagePointerMove}
                onPointerUp={onStagePointerUp}
              >
                {cropRect && (
                  <div
                    className={cn('absolute border-2 border-brand-400 bg-brand-400/15', aspectRatio === 'square' && 'rounded-full')}
                    style={{
                      left: Math.min(cropRect.sx, cropRect.ex),
                      top: Math.min(cropRect.sy, cropRect.ey),
                      width: Math.abs(cropRect.ex - cropRect.sx),
                      height: Math.abs(cropRect.ey - cropRect.sy),
                    }}
                  />
                )}
              </div>
            )}
            {canPan && (
              <div
                className="absolute inset-0"
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                onPointerDown={onStagePointerDown}
                onPointerMove={onStagePointerMove}
                onPointerUp={onStagePointerUp}
              />
            )}
          </div>
        )}
        {imgLoaded && !imgError && canPan && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Move size={12} /> Arrastra para mover
          </div>
        )}
        {isOriginal && imgLoaded && !imgError && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
            Original
          </div>
        )}
      </div>
    );
  };

  const getCropSourceRegion = (): { sx: number; sy: number; sw: number; sh: number } => {
    if (!imgRef.current || naturalSize.w === 0) {
      return { sx: 0, sy: 0, sw: naturalSize.w, sh: naturalSize.h };
    }
    const dispRect = imgRef.current.getBoundingClientRect();
    if (!cropRect || !overlayRef.current) {
      return { sx: 0, sy: 0, sw: naturalSize.w, sh: naturalSize.h };
    }
    const scaleX = naturalSize.w / dispRect.width;
    const scaleY = naturalSize.h / dispRect.height;
    const cropLeft = Math.min(cropRect.sx, cropRect.ex);
    const cropTop = Math.min(cropRect.sy, cropRect.ey);
    const cropW = Math.abs(cropRect.ex - cropRect.sx);
    const cropH = Math.abs(cropRect.ey - cropRect.sy);
    const zoomFactor = adj.zoom / 100;
    const sx = cropLeft * scaleX / zoomFactor;
    const sy = cropTop * scaleY / zoomFactor;
    const sw = cropW * scaleX / zoomFactor;
    const sh = cropH * scaleY / zoomFactor;
    return {
      sx: Math.max(0, Math.min(naturalSize.w - 1, sx)),
      sy: Math.max(0, Math.min(naturalSize.h - 1, sy)),
      sw: Math.max(1, Math.min(naturalSize.w - sx, sw)),
      sh: Math.max(1, Math.min(naturalSize.h - sy, sh)),
    };
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { sx, sy, sw, sh } = getCropSourceRegion();

    let outW: number;
    let outH: number;
    if (aspectRatio === 'square') {
      const side = Math.min(sw, sh);
      outW = Math.min(side, MAX_OUTPUT);
      outH = outW;
    } else {
      const ratio = sw / sh;
      outW = Math.min(sw, MAX_OUTPUT);
      outH = outW / ratio;
    }
    canvas.width = Math.max(1, Math.round(outW));
    canvas.height = Math.max(1, Math.round(outH));

    ctx.filter = buildCssFilter(false);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();

    if (tf.rotate || tf.flipH || tf.flipV) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((tf.rotate * Math.PI) / 180);
      if (tf.flipH) ctx.scale(-1, 1);
      if (tf.flipV) ctx.scale(1, -1);
      const srcSide = aspectRatio === 'square' ? Math.min(sw, sh) : 0;
      ctx.drawImage(
        img,
        aspectRatio === 'square' ? sx + (sw - srcSide) / 2 : sx,
        aspectRatio === 'square' ? sy + (sh - srcSide) / 2 : sy,
        aspectRatio === 'square' ? srcSide : sw,
        aspectRatio === 'square' ? srcSide : sh,
        -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height,
      );
    } else if (aspectRatio === 'square') {
      const srcSide = Math.min(sw, sh);
      ctx.drawImage(img, sx + (sw - srcSide) / 2, sy + (sh - srcSide) / 2, srcSide, srcSide, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
    ctx.filter = 'none';

    if (adj.sharpness > 0) applySharpen(ctx, canvas, adj.sharpness / 100);

    const hasAdjustments = adj.brightness !== 100 || adj.contrast !== 100 || adj.saturation !== 100 ||
      adj.temperature !== 0 || adj.blur > 0 || activeFilter !== 0 || adj.sharpness > 0 ||
      adj.shadows > 0 || adj.highlights > 0 || adj.exposure !== 0 || adj.intensity !== 100 ||
      adj.tint !== 0 || adj.bw > 0;
    const outputFormat = hasAdjustments ? 'image/jpeg' : 'image/png';
    const quality = hasAdjustments ? 0.95 : undefined;
    onSave(canvas.toDataURL(outputFormat, quality));
  };

  function applySharpen(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amount: number) {
    const w = canvas.width;
    const h = canvas.height;
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    const k = amount * 0.5;
    const kernel = [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let ki = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              sum += src.data[((y + ky) * w + (x + kx)) * 4 + c] * kernel[ki++];
            }
          }
          dst.data[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, sum));
        }
        dst.data[(y * w + x) * 4 + 3] = src.data[(y * w + x) * 4 + 3];
      }
    }
    ctx.putImageData(dst, 0, 0);
  }

  const tabs: Array<{ key: Tab; label: string; icon: typeof Crop }> = [
    { key: 'crop', label: 'Recortar', icon: Crop },
    { key: 'adjust', label: 'Ajustes', icon: Sun },
    { key: 'filters', label: 'Filtros', icon: Sparkles },
  ];

  const renderSlider = (s: SliderDef) => {
    const val = adj[s.key];
    const display = s.suffix === '°' && s.key === 'temperature' ? (val > 0 ? `+${val}°` : `${val}°`)
      : s.suffix === '°' ? (val > 0 ? `+${val}` : `${val}`)
      : s.suffix === '%' ? `${val}%`
      : `${val}`;
    return (
      <div key={s.key} className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-app">
            <s.icon size={14} className="text-brand-500" /> {s.label}
          </span>
          <span className="text-[11px] font-semibold text-muted tabular-nums">{display}</span>
        </div>
        <input
          type="range"
          min={s.min}
          max={s.max}
          step={s.step ?? 1}
          value={val}
          onChange={(e) => {
            const v = Number(e.target.value);
            setAdj((p) => ({ ...p, [s.key]: v }));
            if (s.key === 'zoom' && v <= 100) setPan({ x: 0, y: 0 });
          }}
          className="vex-range w-full"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[58] flex items-center justify-center bg-[var(--vex-overlay)] p-3 backdrop-blur-sm sm:p-4" onClick={onCancel}>
      <div
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-app bg-[var(--vex-surface)] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-soft px-4 py-3">
          <h2 className="font-display text-lg font-bold text-strong">{title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-[var(--vex-surface-2)]">
              <RotateCcw size={14} /> Restablecer
            </button>
            <button onClick={onCancel} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-[var(--vex-surface-2)]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body: two-column on desktop, stacked on mobile */}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Preview column — sticky on mobile, left on desktop */}
          <div className="flex shrink-0 flex-col gap-2 border-b border-soft p-3 sm:w-1/2 sm:border-b-0 sm:border-r sm:p-4">
            <div className="relative flex-1" style={{ minHeight: 260, height: 'min(46vh, 420px)' }}>
              {renderPreview()}
            </div>

            {/* Compare controls */}
            <div className="flex shrink-0 items-center justify-center gap-2">
              <button
                onPointerDown={() => setPeekOriginal(true)}
                onPointerUp={() => setPeekOriginal(false)}
                onPointerLeave={() => setPeekOriginal(false)}
                onPointerCancel={() => setPeekOriginal(false)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition select-none',
                  peekOriginal ? 'gradient-brand text-white' : 'bg-[var(--vex-surface-2)] text-app hover:bg-[var(--vex-border-soft)]',
                )}
              >
                <Layers size={13} /> Antes / Después
              </button>
              <button
                onClick={() => setShowOriginal((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  showOriginal ? 'gradient-brand text-white' : 'bg-[var(--vex-surface-2)] text-app hover:bg-[var(--vex-border-soft)]',
                )}
              >
                <Eye size={13} /> Ver original
              </button>
            </div>
          </div>

          {/* Tools column — scrollable */}
          <div className="flex min-h-0 flex-1 flex-col sm:w-1/2">
            {/* Sticky tabs */}
            <div className="sticky top-0 z-10 flex shrink-0 justify-center gap-2 border-b border-soft bg-[var(--vex-surface)] px-4 py-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition sm:text-[13px]',
                    tab === t.key ? 'gradient-brand text-white shadow-soft' : 'bg-[var(--vex-surface-2)] text-app hover:bg-[var(--vex-border-soft)]',
                  )}
                >
                  <t.icon size={15} /> {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable tool content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {tab === 'crop' && (
                <div className="space-y-3">
                  <p className="text-center text-xs text-muted">
                    {aspectRatio === 'square'
                      ? 'Arrastra para seleccionar el área cuadrada de tu foto de perfil'
                      : 'Arrastra sobre la imagen para seleccionar el área de recorte'}
                  </p>
                  {cropMode === 'done' && (
                    <div className="flex justify-center">
                      <button onClick={() => { setCropRect(null); setCropMode('idle'); }} className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                        Dibujar nuevo recorte
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => setTf((p) => ({ ...p, rotate: (p.rotate + 90) % 360 }))} className="btn-ghost px-3 py-2 text-sm">
                      <RotateCw size={16} /> Girar 90°
                    </button>
                    <button onClick={() => setTf((p) => ({ ...p, flipH: !p.flipH }))} className="btn-ghost px-3 py-2 text-sm">
                      <FlipHorizontal2 size={16} /> Voltear H
                    </button>
                    <button onClick={() => setTf((p) => ({ ...p, flipV: !p.flipV }))} className="btn-ghost px-3 py-2 text-sm">
                      <FlipVertical2 size={16} /> Voltear V
                    </button>
                  </div>
                  <div className="space-y-1 pt-1">
                    {renderSlider({ key: 'zoom', label: 'Zoom', icon: ZoomIn, min: 100, max: 300, step: 5, suffix: '%' })}
                  </div>
                  <p className="text-center text-xs text-muted">Usa la rueda del mouse sobre la imagen para acercar y alejar.</p>
                </div>
              )}

              {tab === 'adjust' && (
                <div className="space-y-4">
                  {SLIDER_GROUPS.map((group) => (
                    <div key={group.title} className="space-y-2.5">
                      <div className="flex items-center gap-1.5 border-b border-soft pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                        <group.icon size={13} className="text-brand-500" /> {group.title}
                      </div>
                      {group.sliders.map(renderSlider)}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'filters' && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {FILTERS.map((f, i) => (
                    <button
                      key={f.name}
                      onClick={() => setActiveFilter(i)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border p-1.5 transition',
                        activeFilter === i ? 'border-brand-400 ring-2 ring-brand-200 dark:ring-brand-900/50' : 'border-app hover:bg-[var(--vex-surface-2)]',
                      )}
                    >
                      <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" style={{ filter: f.preview }} />
                      <span className="text-[10px] font-semibold text-app">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-soft px-4 py-3">
          <button onClick={onCancel} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button onClick={handleSave} disabled={imgError || !imgLoaded} className="btn-primary px-5 py-2 text-sm">
            <Check size={16} /> Aplicar
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <img
        src={src}
        alt=""
        className="hidden"
        onLoad={(e) => {
          const t = e.currentTarget;
          setNaturalSize({ w: t.naturalWidth, h: t.naturalHeight });
          setImgLoaded(true);
        }}
        onError={() => setImgError(true)}
      />
    </div>
  );
}
