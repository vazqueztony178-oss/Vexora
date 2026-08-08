export function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`.trim();
}

export function initials(u: { firstName: string; lastName: string }): string {
  const a = u.firstName.charAt(0).toUpperCase();
  const b = u.lastName.charAt(0).toUpperCase();
  return (a + b) || '?';
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthName(m: number): string {
  return MONTHS_ES[m - 1] ?? '';
}

export function formatBirthDate(day: number, month: number, year: number): string {
  return `${day} de ${monthName(month)} de ${year}`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'ahora mismo';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `hace ${w} sem`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} mes${mo > 1 ? 'es' : ''}`;
  const y = Math.floor(d / 365);
  return `hace ${y} año${y > 1 ? 's' : ''}`;
}

export function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} de ${monthName(d.getMonth() + 1)} de ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const h2 = (h + 40) % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${h2} 70% 45%))`;
}
