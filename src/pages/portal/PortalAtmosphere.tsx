import { useEffect, useRef } from 'react';

/**
 * The fixed, non-interactive background layer behind the portal content:
 * a parchment base, drifting tonal fields, a faint hand-placed "learning
 * field" of contours and nodes, and near-imperceptible ambient motion.
 *
 * CSS and SVG only — no canvas, no WebGL. A small rAF loop feeds two custom
 * properties (scroll parallax and a barely-visible pointer field) and is a
 * no-op under prefers-reduced-motion or on coarse pointers. The layer is
 * masked away from the left/centre so it never competes with the content.
 */
export function PortalAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (reduce.matches) return;

    let raf = 0;
    let scrollTarget = 0;
    let scrollValue = 0;
    const pointer = { x: 0.72, y: 0.28, tx: 0.72, ty: 0.28, active: false };

    const onScroll = () => {
      scrollTarget = Math.min(window.scrollY, 1400);
      schedule();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!finePointer.matches) return;
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
      pointer.active = true;
      schedule();
    };

    const tick = () => {
      raf = 0;
      scrollValue += (scrollTarget - scrollValue) * 0.08;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      root.style.setProperty('--atmos-scroll', scrollValue.toFixed(1));
      if (pointer.active) {
        root.style.setProperty('--atmos-mx', `${(pointer.x * 100).toFixed(1)}%`);
        root.style.setProperty('--atmos-my', `${(pointer.y * 100).toFixed(1)}%`);
      }

      const settling =
        Math.abs(scrollTarget - scrollValue) > 0.5 ||
        Math.abs(pointer.tx - pointer.x) > 0.001 ||
        Math.abs(pointer.ty - pointer.y) > 0.001;
      if (settling) raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    if (finePointer.matches) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="portal-atmos" aria-hidden="true" ref={rootRef}>
      <div className="portal-atmos__base" />
      <div className="portal-atmos__field portal-atmos__field--a" />
      <div className="portal-atmos__field portal-atmos__field--b" />
      <div className="portal-atmos__spot" />
      <div className="portal-atmos__rules" />

      <svg
        className="portal-atmos__field-map"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMaxYMid slice"
        aria-hidden="true"
      >
        {/* free contours — a quiet topography, not connected to the network */}
        <path className="pa-contour" d="M540 96 C 720 60, 900 150, 1060 96 S 1240 40, 1320 120" />
        <path className="pa-contour" d="M470 360 C 690 300, 860 430, 1090 356 S 1300 300, 1360 372" />
        <path className="pa-contour" d="M600 690 C 780 640, 980 740, 1160 672 S 1320 620, 1400 690" />

        {/* the learning network — irregular, hand-placed */}
        <g className="pa-net">
          <path className="pa-link" d="M812 150 C 900 190, 980 200, 1044 250" />
          <path className="pa-link" d="M1044 250 C 1010 360, 980 470, 968 556" />
          <path className="pa-link" d="M812 150 C 760 280, 730 340, 704 404" />
          <path className="pa-link" d="M704 404 C 800 470, 900 510, 968 556" />
          <path className="pa-link" d="M968 556 C 1030 640, 1090 700, 1128 764" />
          <path className="pa-link pa-link--faint" d="M704 404 C 660 520, 620 620, 604 720" />

          {/* the travelling signal rides this one link */}
          <path className="pa-signal" d="M812 150 C 900 190, 980 200, 1044 250" />

          <circle className="pa-node" cx="812" cy="150" r="3.2" />
          <circle className="pa-node pa-node--pulse" cx="1044" cy="250" r="3.6" />
          <circle className="pa-node" cx="704" cy="404" r="2.6" />
          <circle className="pa-node pa-node--pulse" cx="968" cy="556" r="3.2" />
          <circle className="pa-node" cx="1128" cy="764" r="2.4" />
          <circle className="pa-node" cx="604" cy="720" r="2.2" />
        </g>
      </svg>
    </div>
  );
}
