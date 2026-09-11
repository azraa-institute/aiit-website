import './logo.css';

interface LogoProps {
  /** 'light' = the white/for-dark logo; 'dark' = the black logo for light backgrounds. */
  variant?: 'light' | 'dark';
  className?: string;
}

/** The official AIIT — Azraa Institute of Information Technology logo. */
export function Logo({ variant = 'dark', className }: LogoProps) {
  const src =
    variant === 'light'
      ? '/assets/brand/azraa-institute-of-information-technology-official-logo.png'
      : '/assets/brand/azraa-institute-of-information-technology-official-logo-black.png';
  return (
    <img
      src={src}
      alt="AIIT, Azraa Institute of Information Technology"
      className={`aiit-logo ${className ?? ''}`}
      width={260}
      height={50}
      decoding="async"
    />
  );
}
