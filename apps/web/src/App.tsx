import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { AuthProvider } from '@/lib/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';

/**
 * Fades out and removes the static #splash overlay (defined in index.html)
 * once the first route has actually rendered. It is placed inside <Suspense>
 * so it only mounts after the initial lazy route resolves; on later
 * navigations #splash is already gone and this is a no-op.
 */
function SplashGate() {
  useEffect(() => {
    const el = document.getElementById('splash');
    if (!el) return;
    let done = false;
    const remove = () => {
      if (done) return;
      done = true;
      el.remove();
    };
    const raf = requestAnimationFrame(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        remove();
        return;
      }
      el.addEventListener('transitionend', remove, { once: true });
      el.classList.add('is-out');
      window.setTimeout(remove, 450);
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}

const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const CoursesPage = lazy(() => import('@/pages/CoursesPage'));
const CourseDetailPage = lazy(() => import('@/pages/CourseDetailPage'));
const ResourcesPage = lazy(() => import('@/pages/ResourcesPage'));
const ResourceDetailPage = lazy(() => import('@/pages/ResourceDetailPage'));
const WebinarPage = lazy(() => import('@/pages/WebinarPage'));
const FaqsPage = lazy(() => import('@/pages/FaqsPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const InstructorsPage = lazy(() => import('@/pages/InstructorsPage'));
const WhyJoinPage = lazy(() => import('@/pages/WhyJoinPage'));
const BlueprintPage = lazy(() => import('@/pages/BlueprintPage'));
const AffiliatePage = lazy(() => import('@/pages/AffiliatePage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const PortalLayout = lazy(() => import('@/pages/portal/PortalLayout'));
const DashboardPage = lazy(() => import('@/pages/portal/DashboardPage'));
const MyCoursesPage = lazy(() => import('@/pages/portal/MyCoursesPage'));
const CertificatesPage = lazy(() => import('@/pages/portal/CertificatesPage'));
const AssignmentsPage = lazy(() => import('@/pages/portal/AssignmentsPage'));
const PortalResourcesPage = lazy(() => import('@/pages/portal/PortalResourcesPage'));
const WebinarsPage = lazy(() => import('@/pages/portal/WebinarsPage'));
const NotificationsPage = lazy(() => import('@/pages/portal/NotificationsPage'));
const ProfilePage = lazy(() => import('@/pages/portal/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/portal/SettingsPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <SplashGate />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/resources/:slug" element={<ResourceDetailPage />} />
          <Route path="/webinar" element={<WebinarPage />} />
          <Route path="/faqs" element={<FaqsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/shop" element={<ShopPage />} />
          {/* Legacy slug — the product's slug was corrected. */}
          <Route
            path="/shop/laptop-stand-p43fallen-key"
            element={<Navigate to="/shop/laptop-stand-p43f-allen-key" replace />}
          />
          <Route path="/shop/:slug" element={<ProductDetailPage />} />
          <Route path="/instructors" element={<InstructorsPage />} />
          <Route path="/why-join" element={<WhyJoinPage />} />
          <Route path="/aiit-blueprint" element={<BlueprintPage />} />
          <Route path="/affiliate" element={<AffiliatePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/portal"
            element={
              <RequireAuth>
                <PortalLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="courses" element={<MyCoursesPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="resources" element={<PortalResourcesPage />} />
            <Route path="webinars" element={<WebinarsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="/privacy-policy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
