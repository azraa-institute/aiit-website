import type { ReactNode } from 'react';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { EnrollmentPopup } from '@/components/common/EnrollmentPopup';
import { FloatingActions } from '@/components/common/FloatingActions';
import { useAuth } from '@/lib/AuthContext';
import './layout.css';

interface LayoutProps {
  children: ReactNode;
  /** Homepage-style pages with a dark full-bleed hero under the header. */
  heroPage?: boolean;
}

/**
 * Every public page mounts its own `<Layout>` (there's no shared parent
 * route wrapping them), so anything that must survive client-side
 * navigation between pages -- like Quill's conversation state -- can't
 * live in here; it'd unmount every time. See App.tsx's `<QuillProvider>`,
 * mounted once above the whole route tree, for that instead.
 */
export function Layout({ children, heroPage = false }: LayoutProps) {
  const { status } = useAuth();
  return (
    <div className={`layout ${heroPage ? 'layout--hero' : ''}`}>
      <AnnouncementBar />
      <Header overHero={heroPage} />
      <main id="main" className="layout__main">
        {children}
      </main>
      {/* Guests only -- a signed-in learner browsing a public marketing page
          (still mounted under this shared Layout) doesn't need the full
          marketing footer; portal/instructor/admin/affiliate areas never
          render this component at all, so this is the one place auth state
          actually needs checking. */}
      {status !== 'authenticated' && <Footer />}
      <FloatingActions />
      <EnrollmentPopup />
    </div>
  );
}
