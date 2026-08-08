import { Globe, Users, Lock, UserMinus, Star } from 'lucide-react';
import type { PostVisibility } from '@/types';
import type { LucideIcon } from 'lucide-react';

export interface PrivacyOption {
  value: PostVisibility;
  label: string;
  short: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const PRIVACY_OPTIONS: PrivacyOption[] = [
  { value: 'public', label: 'Público', short: 'Público', icon: Globe, color: 'text-sky-500', description: 'Cualquiera puede ver esta publicación' },
  { value: 'friends', label: 'Solo amigos', short: 'Amigos', icon: Users, color: 'text-brand-500', description: 'Solo las personas que sigues pueden verla' },
  { value: 'private', label: 'Solo yo', short: 'Solo yo', icon: Lock, color: 'text-muted', description: 'Solo tú puedes ver esta publicación' },
  { value: 'friends_except', label: 'Amigos excepto…', short: 'Amigos exc.', icon: UserMinus, color: 'text-amber-500', description: 'Tus amigos excepto quienes elijas' },
  { value: 'custom', label: 'Lista personalizada', short: 'Lista', icon: Star, color: 'text-grape-500', description: 'Solo las personas que elijas' },
];

export function privacyOption(v: PostVisibility): PrivacyOption {
  return PRIVACY_OPTIONS.find((o) => o.value === v) ?? PRIVACY_OPTIONS[0];
}
