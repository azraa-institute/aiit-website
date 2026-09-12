import { initials } from '@/lib/avatar';
import { cn } from '@/lib/cn';
import './avatar.css';

interface AvatarProps {
  name: string | null | undefined;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Photo when one exists, otherwise initials derived from the name, otherwise a generic mark -- used everywhere an avatar renders (topbar, rail, Profile). */
export function Avatar({ name, photoUrl, size = 'md', className }: AvatarProps) {
  const label = initials(name);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn('avatar', `avatar--${size}`, className)}
      />
    );
  }

  return (
    <span className={cn('avatar', 'avatar--mark', `avatar--${size}`, className)} aria-hidden="true">
      {label ?? 'A'}
    </span>
  );
}
