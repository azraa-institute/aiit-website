import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';
import './profile-completion-banner.css';

interface ProfileCompletionBannerProps {
  visible: boolean;
  onComplete: () => void;
}

/** Same mark as CourseDetailPage's AlertIcon -- a deliberately shared glyph
    for "your profile is blocking something" wherever that message shows up. */
function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" />
    </svg>
  );
}

/**
 * Persistent (not auto-dismissing, unlike components/common/Toast.tsx)
 * reminder shown on every portal page while the profile is incomplete --
 * it has to survive navigation, not expire after a few seconds. The CTA
 * reopens the same ProfileCompletionWizard the learner can otherwise skip,
 * rather than duplicating the flow.
 *
 * Always mounted (never conditionally inserted/removed) -- PortalLayout
 * passes `visible` and this collapses to zero height via CSS instead.
 * Confirmed live: mounting this as a brand-new grid item *after* the
 * initial paint, right next to `.portal-topbar`'s `position: sticky`,
 * triggers a real Chromium paint-invalidation bug where that whole top
 * strip of the page stops repainting entirely (not just this banner --
 * verified by changing unrelated styles nearby and seeing no repaint
 * either) until a hard navigation. Keeping the grid item present from
 * first paint and only transitioning its size avoids ever inserting a
 * new row above the sticky topbar, which is what triggers it.
 */
export function ProfileCompletionBanner({ visible, onComplete }: ProfileCompletionBannerProps) {
  return (
    <div className={cn('pcb', !visible && 'pcb--collapsed')} role="status" aria-hidden={!visible}>
      <div className="pcb__copy">
        <span className="pcb__icon" aria-hidden="true">
          <AlertIcon />
        </span>
        <div>
          <p className="pcb__eyebrow">Complete your profile</p>
          <p className="pcb__message">
            Finish your learner profile to unlock course enrollment, certificates and your learning activities.
          </p>
        </div>
      </div>
      <Button
        as="button"
        type="button"
        size="sm"
        onClick={onComplete}
        tabIndex={visible ? undefined : -1}
        className="pcb__cta"
      >
        Continue profile
      </Button>
    </div>
  );
}
