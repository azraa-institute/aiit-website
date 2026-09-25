import { Link, NavLink, Outlet } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/layout/Logo';
import './admin.css';

/** Staff area shell: AIIT-branded, deliberately plainer than the learner portal -- this is a working tool. */
export default function AdminLayout() {
  return (
    <div className="admin">
      <Seo title="Admin" path="/admin" noindex />
      <header className="admin-head">
        <Link to="/" className="admin-head__brand" aria-label="AIIT home">
          <Logo variant="dark" className="admin-head__logo" />
        </Link>
        <p className="admin-head__eyebrow">Admin</p>
        <nav className="admin-head__nav" aria-label="Admin sections">
          <NavLink to="/admin" end className={({ isActive }) => cn(isActive && 'is-active')}>
            Timetables
          </NavLink>
          <NavLink to="/admin/classes" className={({ isActive }) => cn(isActive && 'is-active')}>
            Classes
          </NavLink>
        </nav>
        <Link to="/portal" className="admin-head__back">
          ← Learner portal
        </Link>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
