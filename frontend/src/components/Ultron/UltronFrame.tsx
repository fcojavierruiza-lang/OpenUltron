import { useEffect, useRef, useState } from 'react';

/**
 * Glowing HUD frame around the whole Ultron screen: chamfered corners,
 * a raised notch in the middle of the top and bottom edges, and bright
 * accent segments.
 */
export function UltronFrame() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const m = 10; // margin
  const d = 14; // notch depth
  const c = Math.min(46, w * 0.05, h * 0.08); // corner chamfer
  const n0 = w * 0.3, n1 = w * 0.7;

  const outline = w && h
    ? [
        [m, m + d + c], [m + c, m + d], [n0, m + d], [n0 + d, m], [n1 - d, m], [n1, m + d],
        [w - m - c, m + d], [w - m, m + d + c], [w - m, h - m - d - c], [w - m - c, h - m - d],
        [n1, h - m - d], [n1 - d, h - m], [n0 + d, h - m], [n0, h - m - d], [m + c, h - m - d],
        [m, h - m - d - c],
      ].map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z'
    : '';

  // Short bright accents: corners and notch shoulders.
  const accents = w && h
    ? [
        `M${m} ${m + d + c + 60} L${m} ${m + d + c} L${m + c} ${m + d} L${m + c + 70} ${m + d}`,
        `M${w - m} ${m + d + c + 60} L${w - m} ${m + d + c} L${w - m - c} ${m + d} L${w - m - c - 70} ${m + d}`,
        `M${m} ${h - m - d - c - 60} L${m} ${h - m - d - c} L${m + c} ${h - m - d} L${m + c + 70} ${h - m - d}`,
        `M${w - m} ${h - m - d - c - 60} L${w - m} ${h - m - d - c} L${w - m - c} ${h - m - d} L${w - m - c - 70} ${h - m - d}`,
        `M${n0 - 60} ${m + d} L${n0} ${m + d} L${n0 + d} ${m} L${n0 + d + 50} ${m}`,
        `M${n1 + 60} ${m + d} L${n1} ${m + d} L${n1 - d} ${m} L${n1 - d - 50} ${m}`,
        `M${w / 2 - 40} ${m} L${w / 2 + 40} ${m}`,
        `M${n0 - 60} ${h - m - d} L${n0} ${h - m - d} L${n0 + d} ${h - m} L${n0 + d + 50} ${h - m}`,
        `M${n1 + 60} ${h - m - d} L${n1} ${h - m - d} L${n1 - d} ${h - m} L${n1 - d - 50} ${h - m}`,
        `M${w / 2 - 50} ${h - m} L${w / 2 + 50} ${h - m}`,
        `M${m} ${h * 0.45} L${m} ${h * 0.55}`,
        `M${w - m} ${h * 0.45} L${w - m} ${h * 0.55}`,
      ]
    : [];

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none z-[1]" aria-hidden="true">
      {w > 0 && (
        <svg width={w} height={h} className="absolute inset-0">
          <defs>
            <filter id="ultron-frame-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="ultron-frame-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff2a1f" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#ff2a1f" stopOpacity="0" />
              <stop offset="100%" stopColor="#ff2a1f" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={outline} fill="url(#ultron-frame-fill)" stroke="#ff2a1f" strokeOpacity="0.55" strokeWidth="1.4" filter="url(#ultron-frame-glow)" />
          <g transform={`translate(${w / 2} ${h / 2}) scale(${(w - 14) / w} ${(h - 14) / h}) translate(${-w / 2} ${-h / 2})`}>
            <path d={outline} fill="none" stroke="#ff2a1f" strokeOpacity="0.16" strokeWidth="1" />
          </g>
          {accents.map((a, i) => (
            <path key={i} d={a} fill="none" stroke="#ff4a35" strokeWidth="2.4" strokeLinecap="round" filter="url(#ultron-frame-glow)" className="ultron-frame-accent" style={{ animationDelay: `${(i % 4) * 0.7}s` }} />
          ))}
        </svg>
      )}
    </div>
  );
}
