import type { ReactNode } from 'react';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { EnrollmentPopup } from '@/components/common/EnrollmentPopup';
import { FloatingActions } from '@/components/common/FloatingActions';
import './layout.css';

interface LayoutProps {
  children: ReactNode;
  /** Homepage-style pages with a dark full-bleed hero under the header. */
  heroPage?: boolean;
}

export function Layout({ children, heroPage = false }: LayoutProps) {
  return (
    <div className={`layout ${heroPage ? 'layout--hero' : ''}`}>
      <AnnouncementBar />
      <Header overHero={heroPage} />
      <main id="main" className="layout__main">
        {children}
      </main>
      <Footer />
      <FloatingActions />
      <EnrollmentPopup />
    </div>
  );
}
