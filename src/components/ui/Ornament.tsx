/**
 * Timurid geometric ornament, drawn as inline SVG.
 *
 * Inline rather than image files so each piece inherits the palette through
 * currentColor and stays crisp at any size — and so a colour change is one token
 * edit, not a round of asset exports.
 */

/** Eight-point star (girih) built from 16 alternating radii — the motif on almost
 * every Samarkand facade. Rendered as glazed mosaic segments, like a cut tile panel. */
export function StarRosette({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // 16 vertices alternating between outer and inner radius, 22.5° apart.
  const cx = 50;
  const cy = 50;
  const outer = 46;
  const inner = 19;
  const points = Array.from({ length: 16 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <polygon points={points} fill="var(--color-cobalt)" opacity="0.9" />
      <polygon
        points={points}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="1.2"
        opacity="0.85"
      />
      {/* Inner rosette: the glaze highlight at the centre of a tile panel */}
      <circle cx={cx} cy={cy} r="15" fill="var(--color-turquoise)" />
      <circle
        cx={cx}
        cy={cy}
        r="15"
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="1.2"
        opacity="0.9"
      />
      {/* Eight petals radiating from the centre */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (Math.PI / 4) * i;
        const x = cx + 9 * Math.cos(angle);
        const y = cy + 9 * Math.sin(angle);
        return <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r="2.6" fill="var(--color-gold)" opacity="0.9" />;
      })}
      <circle cx={cx} cy={cy} r="4" fill="var(--color-terracotta)" />
    </svg>
  );
}

/**
 * Section band: an illuminated rule with a star medallion at its centre, the way a
 * manuscript separates sections. Use to close a page header, not between every block.
 */
export function OrnamentalDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className="ornament-rule h-3.5 max-w-24 flex-1 opacity-70" />
      <StarRosette size={22} />
      <span className="ornament-rule h-3.5 max-w-24 flex-1 opacity-70" />
    </div>
  );
}

/**
 * Scattered mosaic tesserae, echoing the broken-tile arrangement of a mosaic panel.
 * Purely atmospheric, so it is hidden from assistive tech and skipped on small
 * screens where it would crowd the content.
 */
export function MosaicScatter({ className = "" }: { className?: string }) {
  const tiles = [
    { x: 4, y: 18, s: 26, r: -14, fill: "var(--color-cobalt)" },
    { x: 34, y: 4, s: 18, r: 22, fill: "var(--color-turquoise)" },
    { x: 58, y: 22, s: 22, r: -8, fill: "var(--color-gold)" },
    { x: 20, y: 46, s: 30, r: 10, fill: "var(--color-turquoise)" },
    { x: 56, y: 54, s: 16, r: -24, fill: "var(--color-terracotta)" },
    { x: 6, y: 74, s: 14, r: 30, fill: "var(--color-cobalt)" },
    { x: 40, y: 76, s: 20, r: -6, fill: "var(--color-gold)" },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      role="presentation"
      preserveAspectRatio="xMidYMid meet"
    >
      {tiles.map((t, i) => (
        <g key={i} transform={`rotate(${t.r} ${t.x + t.s / 2} ${t.y + t.s / 2})`}>
          <rect
            x={t.x}
            y={t.y}
            width={t.s}
            height={t.s}
            rx="1.5"
            fill={t.fill}
            opacity="0.82"
          />
          <rect
            x={t.x}
            y={t.y}
            width={t.s}
            height={t.s}
            rx="1.5"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="0.7"
            opacity="0.55"
          />
          {/* Hairline cross, as on a quartered glazed tile */}
          <path
            d={`M${t.x} ${t.y + t.s / 2} H${t.x + t.s} M${t.x + t.s / 2} ${t.y} V${t.y + t.s}`}
            stroke="var(--color-surface)"
            strokeWidth="0.6"
            opacity="0.45"
          />
        </g>
      ))}
    </svg>
  );
}

/** Arched frame (pishtaq), the pointed portal silhouette of a Timurid gateway.
 * Used to crown the wordmark on entry screens. */
export function ArchFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 120"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path
          d="M20 118 V54 Q20 20 100 6 Q180 20 180 54 V118"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.4"
          opacity="0.45"
        />
        <path
          d="M28 118 V56 Q28 27 100 14 Q172 27 172 56 V118"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="0.7"
          opacity="0.3"
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
