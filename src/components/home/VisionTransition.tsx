import { useEffect, useRef, useState } from 'react';
import { SITE } from '@/data/site';
import { Section } from '@/components/primitives/Section';
import { Button } from '@/components/primitives/Button';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/cn';
import './vision-journey.css';

/* Four milestones with alternating type: LEARN / PROGRESS in the bold display
   serif, Certify / Globalize (`accent`) in the italic accent face. */
const JOURNEY: { word: string; accent?: boolean }[] = [
  { word: 'LEARN.' },
  { word: 'Certify.', accent: true },
  { word: 'PROGRESS.' },
  { word: 'Globalize.', accent: true },
];
const VIDEO_ID = 'bQbgwPTvMnk';
const VIDEO_TITLE =
  'Your Journey Begins Here | AIIT Official Launch | Learn, Certify, Progress, Globalize';

interface YTPlayer {
  playVideo(): void;
  mute(): void;
  unMute(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (apiReady) return apiReady;
  apiReady = new Promise<void>((resolve) => {
    if (window.YT?.Player) return resolve();
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiReady;
}

/**
 * "The learner's journey" — a signature editorial composition. The four
 * progression words step toward the AIIT launch film, which sits as the
 * destination. It autoplays muted once scrolled into view, and hands off to a
 * call-to-action when it finishes.
 */
export function VisionTransition() {
  const reduced = useReducedMotion();
  const figureRef = useRef<HTMLElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const wantAutoplay = useRef(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !holderRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(holderRef.current, {
        videoId: VIDEO_ID,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, mute: 1, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            try {
              playerRef.current?.getIframe().setAttribute('title', VIDEO_TITLE);
            } catch {
              /* iframe not ready */
            }
            if (wantAutoplay.current) {
              playerRef.current?.mute();
              playerRef.current?.playVideo();
            }
          },
          onStateChange: (e: { data: number }) => {
            if (!window.YT) return;
            if (e.data === window.YT.PlayerState.PLAYING) setEnded(false);
            if (e.data === window.YT.PlayerState.ENDED) setEnded(true);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
    };
  }, []);

  /* Muted autoplay only once the film is genuinely in view — never on page
     load, and never for visitors who prefer reduced motion. */
  useEffect(() => {
    if (reduced) return;
    const el = figureRef.current;
    if (!el) return;
    let triggered = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggered) return;
        triggered = true;
        wantAutoplay.current = true;
        const p = playerRef.current;
        if (p?.playVideo) {
          p.mute();
          p.playVideo();
        }
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const replay = () => {
    setEnded(false);
    playerRef.current?.seekTo(0, true);
    playerRef.current?.playVideo();
  };

  return (
    <Section tone="paper" size="lg" className="vision-journey-section">
      <div className="container container--wide vision-journey">
        <p className="vision-journey__eyebrow eyebrow" data-reveal>
          AIIT, in four words
        </p>

        <h2 className="vision-journey__words" data-reveal>
          {JOURNEY.map((item, i) => (
            <span
              key={item.word}
              className={cn('vision-journey__word', item.accent && 'is-accent')}
            >
              <span className="vision-journey__mark" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              {item.word}
            </span>
          ))}
        </h2>

        <figure
          ref={figureRef}
          className="vision-journey__figure"
          data-reveal
          data-ended={ended ? '' : undefined}
          style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
        >
          <div className="vision-journey__player">
            <div ref={holderRef} />
          </div>

          {ended && (
            <div className="vision-journey__cta on-ink" role="group" aria-label="Next steps">
              <p className="vision-journey__cta-kicker">Your journey starts now</p>
              <p className="vision-journey__cta-title">Ready to begin?</p>
              <div className="vision-journey__cta-actions">
                <Button as="link" to="/courses" arrow>
                  Browse courses
                </Button>
                <Button as="link" to="/register" variant="secondary">
                  Create your account
                </Button>
              </div>
              <button type="button" className="vision-journey__replay" onClick={replay}>
                <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                  <path
                    d="M2.4 7.5a5.1 5.1 0 1 0 1.5-3.6M3.4 1.2v3.2h3.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Replay
              </button>
            </div>
          )}
        </figure>

        <p
          className="vision-journey__statement"
          data-reveal
          style={{ '--reveal-delay': '220ms' } as React.CSSProperties}
        >
          <span>Your journey.</span>
          <span>Your future.</span>
          <span className="vision-journey__support">Our support.</span>
        </p>
      </div>

      {/* Full-width close — deliberately outside the two-column grid above,
          so the description reads across the section rather than being
          trapped in the typography column. */}
      <div className="container container--wide vision-journey__close" data-reveal>
        <p className="vision-journey__close-kicker">{SITE.advantageClose}</p>
        <p className="vision-journey__close-body">{SITE.blurb}</p>
      </div>
    </Section>
  );
}
