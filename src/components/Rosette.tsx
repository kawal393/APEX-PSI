import { cn } from "@/lib/utils";

export type RosetteState = "sealed" | "pending" | "mismatch";

interface RosetteProps {
  /** 64-char lowercase hex SHA-256. Ignored when state is "pending". */
  hash?: string | null;
  /** Rendered pixel size (square). */
  size?: number;
  state?: RosetteState;
  className?: string;
  /** Animate the strokes drawing themselves in. */
  animate?: boolean;
}

const bytesOf = (hash: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i + 1 < hash.length; i += 2) {
    const b = parseInt(hash.slice(i, i + 2), 16);
    out.push(Number.isNaN(b) ? 0 : b);
  }
  return out;
};

/** Closed guilloché curve: r = R + a·cos(kθ), sampled and emitted as an SVG path. */
const guilloche = (
  cx: number,
  cy: number,
  R: number,
  a: number,
  k: number,
  phase: number,
  steps = 720,
) => {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = R + a * Math.cos(k * t + phase);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
};

/** Deterministic ring geometry shared by the component and the standalone markup helper. */
const ringsOf = (hash: string, VB: number) => {
  const b = bytesOf(hash.toLowerCase());
  const c = VB / 2;
  const petals = 8 + (b[0] % 17); // 8–24
  const rings = 3 + (b[3] % 4); // 3–6
  const baseR = VB / 2 - 12;
  const paths = Array.from({ length: rings }, (_, i) => {
    const R = baseR * (1 - i * (0.12 + (b[(i * 5 + 4) % b.length] % 5) / 100));
    const amp = 4 + (b[(i * 7 + 1) % b.length] % 16);
    const k = petals + (b[(i * 3 + 2) % b.length] % 3);
    const phase = ((b[(i * 11 + 6) % b.length] / 255) * Math.PI * 2) + i * 0.35;
    const opacity = 0.35 + (b[(i * 13 + 9) % b.length] % 55) / 100;
    return { d: guilloche(c, c, R, amp, k, phase), opacity };
  });
  return { paths, innerR: 14 + (b[8] % 12), c };
};

/**
 * Standalone SVG markup for the same deterministic rosette — used when the
 * pattern must be rasterised (receipt PNG export) outside React.
 */
export const rosetteSvgMarkup = (hash: string, size = 200, stroke = "#C9A227"): string => {
  const VB = 200;
  const { paths, innerR, c } = ringsOf(hash, VB);
  const body = paths
    .map((p) => `<path d="${p.d}" opacity="${p.opacity.toFixed(2)}" />`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${VB} ${VB}"><g fill="none" stroke="${stroke}" stroke-width="0.7" stroke-linejoin="round">${body}<circle cx="${c}" cy="${c}" r="${innerR}" opacity="0.8" /><circle cx="${c}" cy="${c}" r="${(innerR / 2.4).toFixed(2)}" opacity="0.5" /></g></svg>`;
};

/**
 * ROSETTE — a deterministic guilloché engraving derived from a SHA-256 digest.
 * Same bytes render the same pattern, forever. One changed byte changes the pattern.
 */
const Rosette = ({ hash, size = 96, state = "sealed", className, animate = false }: RosetteProps) => {
  const VB = 200;
  const c = VB / 2;

  if (state === "pending" || !hash || hash.length < 32) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        role="img"
        aria-label="Empty rosette outline — seal pending"
        className={cn("text-muted-foreground/50", className)}
      >
        <circle
          cx={c}
          cy={c}
          r={VB / 2 - 8}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      </svg>
    );
  }

  const b = bytesOf(hash.toLowerCase());
  const petals = 8 + (b[0] % 17); // 8–24
  const rings = 3 + (b[3] % 4); // 3–6
  const baseR = VB / 2 - 12;

  const paths = Array.from({ length: rings }, (_, i) => {
    const R = baseR * (1 - i * (0.12 + (b[(i * 5 + 4) % b.length] % 5) / 100));
    const amp = 4 + (b[(i * 7 + 1) % b.length] % 16);
    const k = petals + (b[(i * 3 + 2) % b.length] % 3);
    const phase = ((b[(i * 11 + 6) % b.length] / 255) * Math.PI * 2) + i * 0.35;
    const opacity = 0.35 + (b[(i * 13 + 9) % b.length] % 55) / 100;
    return { d: guilloche(c, c, R, amp, k, phase), opacity };
  });

  const innerR = 14 + (b[8] % 12);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      role="img"
      aria-label={`Rosette engraved from digest ${hash.slice(0, 16)}`}
      className={cn(state === "mismatch" ? "text-destructive" : "text-gold", className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinejoin="round">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            opacity={p.opacity}
            style={
              animate
                ? {
                    strokeDasharray: 4000,
                    strokeDashoffset: 0,
                    animation: `rosette-draw 900ms ease-in-out ${i * 120}ms both`,
                  }
                : undefined
            }
          />
        ))}
        <circle cx={c} cy={c} r={innerR} opacity="0.8" />
        <circle cx={c} cy={c} r={innerR / 2.4} opacity="0.5" />
      </g>
    </svg>
  );
};

export default Rosette;
