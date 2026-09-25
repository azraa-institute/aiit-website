import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { ChunkErrorBoundary, CHUNK_RELOAD_FLAG } from '@/components/layout/ChunkErrorBoundary';
import { AuthProvider } from '@/lib/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireCompleteProfile } from '@/components/auth/RequireCompleteProfile';
import { RequireRole } from '@/components/auth/RequireRole';
import { CookieConsentProvider } from '@/lib/CookieConsentContext';
import { CookieConsent } from '@/components/common/CookieConsent';

/**
 * Fades out and removes the static #splash overlay (defined in index.html)
 * once the first route has actually rendered. It is placed inside <Suspense>
 * so it only mounts after the initial lazy route resolves; on later
 * navigations #splash is already gone and this is a no-op.
 */
function SplashGate() {
  useEffect(() => {
    // This route rendered successfully -- a later chunk-load error deserves
    // its own fresh auto-reload attempt, not to be blocked by one from
    // earlier in the session.
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);

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
const NewsletterConfirmPage = lazy(() => import('@/pages/NewsletterConfirmPage'));
const NewsletterUnsubscribePage = lazy(() => import('@/pages/NewsletterUnsubscribePage'));
const VerifyCertificatePage = lazy(() => import('@/pages/VerifyCertificatePage'));
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
const SchedulePage = lazy(() => import('@/pages/portal/SchedulePage'));
const SupportPage = lazy(() => import('@/pages/portal/SupportPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminTimetablesPage = lazy(() => import('@/pages/admin/AdminTimetablesPage'));
const AdminClassesPage = lazy(() => import('@/pages/admin/AdminClassesPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminStudentsPage = lazy(() => import('@/pages/admin/AdminStudentsPage'));
const AdminInstructorsPage = lazy(() => import('@/pages/admin/AdminInstructorsPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminCoursesPage = lazy(() => import('@/pages/admin/AdminCoursesPage'));
const AdminComplaintsPage = lazy(() => import('@/pages/admin/AdminComplaintsPage'));
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage'));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'));
const InstructorLayout = lazy(() => import('@/pages/instructor/InstructorLayout'));
const InstructorDashboardPage = lazy(() => import('@/pages/instructor/InstructorDashboardPage'));
const InstructorCoursesPage = lazy(() => import('@/pages/instructor/InstructorCoursesPage'));
const InstructorCoursePage = lazy(() => import('@/pages/instructor/InstructorCoursePage'));
const InstructorAssignmentPage = lazy(() => import('@/pages/instructor/InstructorAssignmentPage'));
const InstructorGradingPage = lazy(() => import('@/pages/instructor/InstructorGradingPage'));
const StaffLoginPage = lazy(() => import('@/pages/auth/StaffLoginPage'));
const StaffChangePasswordPage = lazy(() => import('@/pages/auth/StaffChangePasswordPage'));
const LiveClassroomPage = lazy(() => import('@/pages/portal/LiveClassroomPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/** Old links (before the classroom left /portal) keep working. */
function LegacyClassroomRedirect() {
  const { id } = useParams();
  return <Navigate to={`/classroom/${id ?? ''}`} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <CookieConsentProvider>
        <ScrollToTop />
        <CookieConsent />
        <ChunkErrorBoundary>
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
              <Route path="/newsletter/confirm" element={<NewsletterConfirmPage />} />
              <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribePage />} />
              <Route path="/verify/:credentialId" element={<VerifyCertificatePage />} />
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
                    <RequireRole allow={['learner']}>
                      <PortalLayout />
                    </RequireRole>
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route
                  path="courses"
                  element={
                    <RequireCompleteProfile>
                      <MyCoursesPage />
                    </RequireCompleteProfile>
                  }
                />
                <Route
                  path="certificates"
                  element={
                    <RequireCompleteProfile>
                      <CertificatesPage />
                    </RequireCompleteProfile>
                  }
                />
                <Route
                  path="assignments"
                  element={
                    <RequireCompleteProfile>
                      <AssignmentsPage />
                    </RequireCompleteProfile>
                  }
                />
                <Route
                  path="resources"
                  element={
                    <RequireCompleteProfile>
                      <PortalResourcesPage />
                    </RequireCompleteProfile>
                  }
                />
                <Route
                  path="webinars"
                  element={
                    <RequireCompleteProfile>
                      <WebinarsPage />
                    </RequireCompleteProfile>
                  }
                />
                <Route
                  path="schedule"
                  element={
                    <RequireCompleteProfile>
                      <SchedulePage />
                    </RequireCompleteProfile>
                  }
                />
                <Route path="support" element={<SupportPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* The live classroom is full-screen (its own AIIT-branded header, no portal chrome) and open to
                  every signed-in role: students join, instructors run it, admins can moderate. */}
              <Route
                path="/classroom/:id"
                element={
                  <RequireAuth>
                    <LiveClassroomPage />
                  </RequireAuth>
                }
              />
              <Route path="/portal/classes/:id" element={<LegacyClassroomRedirect />} />

              {/* Staff sign-in (no sign-up: accounts are created by an admin) */}
              <Route path="/staff/login" element={<StaffLoginPage />} />
              <Route
                path="/staff/change-password"
                element={
                  <RequireAuth>
                    <RequireRole allow={['admin', 'instructor']} allowMustChangePassword>
                      <StaffChangePasswordPage />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Admin portal. RequireRole is UX only -- every /admin API endpoint enforces the admin role itself. */}
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <RequireRole allow={['admin']}>
                      <AdminLayout />
                    </RequireRole>
                  </RequireAuth>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="students" element={<AdminStudentsPage />} />
                <Route path="instructors" element={<AdminInstructorsPage />} />
                <Route path="courses" element={<AdminCoursesPage />} />
                <Route path="timetables" element={<AdminTimetablesPage />} />
                <Route path="classes" element={<AdminClassesPage />} />
                <Route path="complaints" element={<AdminComplaintsPage />} />
                <Route path="announcements" element={<AdminAnnouncementsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
              </Route>

              {/* Instructor portal */}
              <Route
                path="/instructor"
                element={
                  <RequireAuth>
                    <RequireRole allow={['instructor']}>
                      <InstructorLayout />
                    </RequireRole>
                  </RequireAuth>
                }
              >
                <Route index element={<InstructorDashboardPage />} />
                <Route path="classes" element={<SchedulePage />} />
                <Route path="courses" element={<InstructorCoursesPage />} />
                <Route path="courses/:courseId" element={<InstructorCoursePage />} />
                <Route path="assignments/:id" element={<InstructorAssignmentPage />} />
                <Route path="grading" element={<InstructorGradingPage />} />
              </Route>

              <Route path="/privacy-policy" element={<LegalPage kind="privacy" />} />
              <Route path="/terms" element={<LegalPage kind="terms" />} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </CookieConsentProvider>
    </AuthProvider>
  );
}
