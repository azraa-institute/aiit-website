import { Button } from '@/components/primitives/Button';
import './profile-completion-banner.css';

interface ProfileCompletionBannerProps {
  onComplete: () => void;
}

/**
 * Persistent (not auto-dismissing, unlike components/common/Toast.tsx)
 * reminder shown on every portal page while the profile is incomplete --
 * it has to survive navigation, not expire after a few seconds. The CTA
 * reopens the same ProfileCompletionWizard the learner can otherwise skip,
 * rather than duplicating the flow.
 */
export function ProfileCompletionBanner({ onComplete }: ProfileCompletionBannerProps) {
  return (
    <div className="pcb on-ink" role="status">
      <div className="pcb__copy">
        <p className="pcb__eyebrow">Complete your profile</p>
        <p className="pcb__message">
          Finish your learner profile to unlock course enrollment, certificates and your learning activities.
        </p>
      </div>
      <Button as="button" type="button" size="sm" onClick={onComplete}>
        Continue profile
      </Button>
    </div>
  );
}
