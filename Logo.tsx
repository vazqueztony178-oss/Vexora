import { initials, avatarGradient } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { User } from '@/types';

export function Avatar({
  user,
  size = 44,
  className,
  ring,
}: {
  user: Pick<User, 'firstName' | 'lastName' | 'username' | 'avatarUrl'>;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const text = initials(user);
  const fontSize = Math.max(12, Math.floor(size * 0.38));
  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full', ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size, background: user.avatarUrl ? undefined : avatarGradient(user.username || user.firstName) }}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display font-bold text-white" style={{ fontSize }}>
          {text}
        </span>
      )}
    </div>
  );
}
