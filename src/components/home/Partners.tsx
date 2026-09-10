import { Section, SectionHeading } from '@/components/primitives/Section';
import './partners.css';

/** "AIIT Partners" — the training-programme partners, as a continuous marquee. */
const PARTNERS: { name: string; src: string }[] = [
  { name: 'AWS Academy', src: '/assets/partners/aws-partner.png' },
  { name: 'Cisco Networking Academy', src: '/assets/partners/cisco-partner.png' },
  { name: 'IBM SkillsBuild', src: '/assets/partners/ibm-partner.png' },
  { name: 'Microsoft Learn for Educators', src: '/assets/partners/microsoft-partner.png' },
  { name: 'Oracle Academy', src: '/assets/partners/oracle-partner.png' },
  { name: 'Google Cloud Skills', src: '/assets/partners/google-cloud-partner.png' },
  { name: 'NVIDIA Deep Learning Institute', src: '/assets/partners/nvidia-partner.png' },
  { name: 'Fortinet Training Institute', src: '/assets/partners/fortinet-partner.png' },
  { name: 'The Linux Foundation', src: '/assets/partners/linux-partner.png' },
  { name: 'GitHub Student Developer Pack', src: '/assets/partners/github-partner.png' },
];

function PartnerCard({ p, hidden }: { p: (typeof PARTNERS)[number]; hidden?: boolean }) {
  return (
    <li className="partners__slide" aria-hidden={hidden || undefined}>
      <div className="partners__card" title={p.name}>
        <img
          src={p.src}
          alt={hidden ? '' : p.name}
          loading="lazy"
          decoding="async"
          width={150}
          height={150}
        />
      </div>
    </li>
  );
}

export function Partners() {
  return (
    <Section tone="ivory" size="tight">
      <div className="container container--wide">
        <SectionHeading eyebrow="Partners" title="AIIT Partners" align="center" />

        {/* Continuous, one-direction marquee — the track holds the partner list
            twice back to back and animates exactly half its own width, so the
            loop point is seamless (no snap-back, no visible restart). Pauses
            on hover/focus so it can be read; reduced-motion gets a static row
            instead of the animation (see partners.css). */}
        <div className="partners-slider" data-reveal>
          <div className="partners__viewport">
            <ul className="partners__track" role="list" aria-label="AIIT training partners">
              {PARTNERS.map((p) => (
                <PartnerCard p={p} key={p.src} />
              ))}
              {PARTNERS.map((p) => (
                <PartnerCard p={p} key={`${p.src}-repeat`} hidden />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
