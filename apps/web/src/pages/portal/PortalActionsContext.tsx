import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface PortalActionsValue {
  /** Opens the profile-completion wizard (same instance PortalLayout auto-opens for an incomplete profile). */
  openWizard: () => void;
  /** Opens the guided portal tour -- used by the wizard's post-completion "Take the tour" CTA and by Settings' "Take a tour" replay button. */
  openTour: () => void;
}

/**
 * Lets a page nested under PortalLayout (e.g. SettingsPage's "Take a tour"
 * button) trigger UI that PortalLayout itself owns (wizardOpen/tourOpen
 * state) without prop-drilling through the router's <Outlet/>. Same
 * provider-around-the-tree shape as AuthContext/CookieConsentContext.
 */
const PortalActionsContext = createContext<PortalActionsValue | undefined>(undefined);

export function PortalActionsProvider({
  value,
  children,
}: {
  value: PortalActionsValue;
  children: ReactNode;
}) {
  return <PortalActionsContext.Provider value={value}>{children}</PortalActionsContext.Provider>;
}

export function usePortalActions(): PortalActionsValue {
  const ctx = useContext(PortalActionsContext);
  if (!ctx) throw new Error('usePortalActions() must be used within the portal layout.');
  return ctx;
}
