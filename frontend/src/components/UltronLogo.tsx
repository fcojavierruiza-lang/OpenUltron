import { useId } from 'react';

interface Props {
  size?: number;
  /** Slowly spin the orbits and pulse the core. Respects prefers-reduced-motion. */
  animated?: boolean;
  className?: string;
}

/**
 * Ultron mark: a red plasma core with three tilted orbits and light comets.
 * Same visual language as the N.Ø.R.K. "Órbitas" core.
 */
// Three tilted orbits of different sizes, each with a comet and a short light trail.
const ORBITS = [
  { angle: -18, rx: 27, ry: 8, width: 1.5, opacity: 0.95, tail: 'M56.47 35.38 L57.21 34.87 L57.82 34.34 L58.31 33.80 L58.67 33.25 L58.90 32.70 L59.00 32.14 L58.96 31.58 L58.80 31.03 L58.50 30.47', cx: 56.47, cy: 35.38 },
  { angle: 42, rx: 24, ry: 10.5, width: 1.2, opacity: 0.8, tail: 'M10.25 27.56 L9.59 28.24 L9.05 28.93 L8.62 29.64 L8.30 30.36 L8.09 31.08 L8.00 31.82 L8.03 32.55 L8.18 33.28 L8.44 34.00', cx: 10.25, cy: 27.56 },
  { angle: 103, rx: 21, ry: 6.5, width: 1.0, opacity: 0.65, tail: 'M42.50 26.37 L41.21 26.16 L39.87 25.97 L38.49 25.82 L37.08 25.69 L35.65 25.60 L34.20 25.54 L32.73 25.50 L31.27 25.50 L29.80 25.54', cx: 42.50, cy: 26.37 },
];

export function UltronLogo({ size = 32, animated = false, className }: Props) {
  const id = useId().replace(/:/g, '');
  const core = `ultron-core-${id}`;
  const halo = `ultron-halo-${id}`;
  const ring = `ultron-ring-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ultron"
      className={`${animated ? 'ultron-logo-animated' : ''} ${className ?? ''}`.trim()}
    >
      <defs>
        <radialGradient id={core} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#fff6ec" />
          <stop offset="28%" stopColor="#ffc07a" />
          <stop offset="58%" stopColor="#ff4a2e" />
          <stop offset="100%" stopColor="#8a0a06" />
        </radialGradient>
        <radialGradient id={halo} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff3b2f" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ff3b2f" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ff3b2f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff3b2f" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#ff6a4d" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ff3b2f" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="31" fill={`url(#${halo})`} className="ultron-logo-halo" />

      <g className="ultron-logo-orbits" style={{ transformOrigin: '32px 32px' }}>
        {ORBITS.map((o) => (
          <g key={o.angle} transform={`rotate(${o.angle} 32 32)`}>
            <ellipse cx="32" cy="32" rx={o.rx} ry={o.ry} stroke={`url(#${ring})`} strokeWidth={o.width} opacity={o.opacity} />
            <path d={o.tail} stroke="#ffb38a" strokeWidth={o.width + 0.6} strokeLinecap="round" opacity={0.55} />
            <circle cx={o.cx} cy={o.cy} r="1.9" fill="#fff0e0" />
          </g>
        ))}
      </g>

      <circle cx="32" cy="32" r="13.5" stroke="#ff3b2f" strokeWidth="0.8" opacity={0.35} />
      <circle cx="32" cy="32" r="11" fill={`url(#${core})`} className="ultron-logo-core" />
      <circle cx="29" cy="28.5" r="3" fill="#fffaf4" opacity="0.55" />
    </svg>
  );
}
