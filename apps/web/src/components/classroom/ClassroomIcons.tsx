import type { ReactNode } from 'react';

/** Small line-icon set for the classroom controls -- same 24px / 1.6 stroke language as the portal's own icons. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const MicIcon = ({ off }: { off?: boolean }) => (
  <Icon>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
    {off ? <path d="M4 4l16 16" /> : null}
  </Icon>
);

export const CameraIcon = ({ off }: { off?: boolean }) => (
  <Icon>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10 5-3v10l-5-3" />
    {off ? <path d="M4 4l16 16" /> : null}
  </Icon>
);

export const ShareIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4M9 11l3-3 3 3M12 8v6" />
  </Icon>
);

export const ChatIcon = () => (
  <Icon>
    <path d="M4 5h16v11H9l-5 4z" />
  </Icon>
);

export const PeopleIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.5a6 6 0 0 1 3 5.5" />
  </Icon>
);

export const LeaveIcon = () => (
  <Icon>
    <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
  </Icon>
);
