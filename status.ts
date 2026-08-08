import type { AttachmentType } from '@/types';

const EXT_MAP: Record<string, AttachmentType> = {
  pdf: 'pdf',
  doc: 'word', docx: 'word',
  xls: 'excel', xlsx: 'excel',
  ppt: 'powerpoint', pptx: 'powerpoint',
  txt: 'txt',
  zip: 'zip', rar: 'zip', '7z': 'zip', gz: 'zip', tar: 'zip',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio', webm: 'audio',
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'];

export function detectAttachmentType(file: File): AttachmentType | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  return EXT_MAP[ext] ?? null;
}

export const ACCEPTED_FILE_EXTS = [
  ...IMAGE_EXTS,
  ...VIDEO_EXTS,
  ...AUDIO_EXTS,
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
  'zip', 'rar', '7z', 'gz', 'tar',
];

export const MAX_VIDEO_DURATION_SEC = 60;

export function attachmentIcon(type: AttachmentType): string {
  switch (type) {
    case 'image': return '📷';
    case 'video': return '🎥';
    case 'audio': return '🎵';
    case 'pdf': return '📄';
    case 'word': return '📄';
    case 'excel': return '📄';
    case 'powerpoint': return '📄';
    case 'txt': return '📄';
    case 'zip': return '🗜️';
    default: return '📄';
  }
}

export function attachmentLabel(type: AttachmentType): string {
  switch (type) {
    case 'pdf': return 'PDF';
    case 'word': return 'Word';
    case 'excel': return 'Excel';
    case 'powerpoint': return 'PowerPoint';
    case 'txt': return 'TXT';
    case 'zip': return 'ZIP';
    case 'image': return 'Foto';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    default: return 'Archivo';
  }
}

export function attachmentColor(type: AttachmentType): string {
  switch (type) {
    case 'pdf': return 'text-red-500';
    case 'word': return 'text-blue-500';
    case 'excel': return 'text-green-500';
    case 'powerpoint': return 'text-orange-500';
    case 'txt': return 'text-slate-400';
    case 'zip': return 'text-amber-500';
    case 'image': return 'text-brand-500';
    case 'video': return 'text-purple-500';
    case 'audio': return 'text-amber-500';
    default: return 'text-slate-400';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
