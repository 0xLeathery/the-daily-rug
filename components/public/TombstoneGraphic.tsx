/**
 * TombstoneGraphic — dramatic SVG graphic for redacted article pages.
 *
 * Three variants: Classified Document Redaction, Tombstone Silhouette,
 * Burning Newspaper. Variant is selected deterministically via pickVariant
 * to prevent SSR/hydration mismatches (no Math.random).
 */

// ─── Deterministic variant picker ──────────────────────────────────────────

/**
 * Returns a deterministic variant index based on the seed string.
 * If seed is undefined, returns 0. Otherwise sums char codes mod count.
 */
export function pickVariant(seed: string | undefined, count: number): number {
  if (seed === undefined) return 0
  if (count <= 1) return 0
  let sum = 0
  for (let i = 0; i < seed.length; i++) {
    sum += seed.charCodeAt(i)
  }
  return sum % count
}

// ─── SVG Variant Components ────────────────────────────────────────────────

interface VariantProps {
  className?: string
}

/**
 * Variant 0: Classified Document Redaction
 * Horizontal black bars over text lines, REDACTED stamp, border frame.
 */
function ClassifiedDocumentVariant({ className }: VariantProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Classified document redaction"
      role="img"
    >
      {/* Document background */}
      <rect width="320" height="240" fill="#1a1a1a" />
      <rect x="10" y="10" width="300" height="220" fill="#0d0d0d" stroke="#cc0000" strokeWidth="3" />

      {/* Document header */}
      <rect x="30" y="25" width="260" height="12" fill="#333" />
      <rect x="60" y="43" width="200" height="8" fill="#333" />

      {/* Redacted text lines — black bars */}
      <rect x="30" y="65" width="260" height="10" fill="#000" />
      <rect x="30" y="82" width="240" height="10" fill="#000" />
      <rect x="30" y="99" width="260" height="10" fill="#000" />
      <rect x="30" y="116" width="180" height="10" fill="#000" />
      <rect x="30" y="133" width="260" height="10" fill="#000" />
      <rect x="30" y="150" width="200" height="10" fill="#000" />

      {/* REDACTED rubber stamp overlay */}
      <g transform="translate(160,115) rotate(-12)">
        <rect x="-95" y="-22" width="190" height="44" fill="none" stroke="#cc0000" strokeWidth="4" />
        <text
          x="0"
          y="8"
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="bold"
          fontSize="26"
          fill="#cc0000"
          letterSpacing="4"
        >
          REDACTED
        </text>
      </g>

      {/* Classification bar at bottom */}
      <rect x="10" y="195" width="300" height="26" fill="#cc0000" />
      <text
        x="160"
        y="213"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="11"
        fill="#ffd700"
        letterSpacing="3"
      >
        TOP SECRET — DO NOT DISTRIBUTE
      </text>
    </svg>
  )
}

/**
 * Variant 1: Tombstone Silhouette
 * Rounded-top tombstone shape with epitaph, brand-red base bar, brand-yellow text.
 */
function TombstoneSilhouetteVariant({ className }: VariantProps) {
  return (
    <svg
      viewBox="0 0 320 260"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Tombstone silhouette"
      role="img"
    >
      {/* Background */}
      <rect width="320" height="260" fill="#1a1a1a" />

      {/* Ground */}
      <rect x="0" y="210" width="320" height="50" fill="#0d0d0d" />

      {/* Tombstone body */}
      <path
        d="M 100 210 L 100 110 Q 100 50 160 50 Q 220 50 220 110 L 220 210 Z"
        fill="#2a2a2a"
        stroke="#cc0000"
        strokeWidth="3"
      />

      {/* Epitaph text */}
      <text
        x="160"
        y="115"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="11"
        fill="#f5f5f5"
        letterSpacing="1"
      >
        HERE LIES
      </text>
      <text
        x="160"
        y="135"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="9"
        fill="#cc0000"
        letterSpacing="2"
      >
        THE TRUTH
      </text>
      <text
        x="160"
        y="155"
        textAnchor="middle"
        fontFamily="monospace"
        fontSize="8"
        fill="#f5f5f5"
        opacity="0.6"
      >
        SILENCED BY WHALE
      </text>

      {/* Horizontal crack line on tombstone */}
      <line x1="115" y1="170" x2="205" y2="170" stroke="#cc0000" strokeWidth="1" opacity="0.4" />

      {/* R.I.P */}
      <text
        x="160"
        y="192"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="14"
        fill="#ffd700"
        letterSpacing="4"
      >
        R.I.P.
      </text>

      {/* Base bar */}
      <rect x="80" y="210" width="160" height="18" fill="#cc0000" />
      <text
        x="160"
        y="223"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="9"
        fill="#ffd700"
        letterSpacing="2"
      >
        REDACTED BY WHALE
      </text>

      {/* Stars / decorative elements */}
      <text x="50" y="150" fontFamily="serif" fontSize="20" fill="#cc0000" opacity="0.3">✦</text>
      <text x="255" y="150" fontFamily="serif" fontSize="20" fill="#cc0000" opacity="0.3">✦</text>
    </svg>
  )
}

/**
 * Variant 2: Burning Newspaper
 * Newspaper rectangle with text line placeholders, flame silhouette at bottom,
 * SILENCED diagonal stamp in brand-yellow.
 */
function BurningNewspaperVariant({ className }: VariantProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Burning newspaper"
      role="img"
    >
      {/* Background */}
      <rect width="320" height="240" fill="#1a1a1a" />

      {/* Newspaper body — slightly yellowed */}
      <rect x="20" y="15" width="280" height="185" fill="#1e1c18" stroke="#333" strokeWidth="1" />

      {/* Newspaper header */}
      <rect x="20" y="15" width="280" height="30" fill="#0d0d0d" />
      <text
        x="160"
        y="36"
        textAnchor="middle"
        fontFamily="serif"
        fontWeight="bold"
        fontSize="14"
        fill="#f5f5f5"
        letterSpacing="6"
      >
        THE DAILY RUG
      </text>

      {/* Column divider */}
      <line x1="165" y1="52" x2="165" y2="190" stroke="#333" strokeWidth="1" />

      {/* Headline placeholder */}
      <rect x="30" y="52" width="270" height="14" fill="#333" opacity="0.8" />
      <rect x="30" y="70" width="200" height="10" fill="#333" opacity="0.5" />

      {/* Text line placeholders — left column */}
      {[90, 105, 120, 135, 150, 165].map((y, i) => (
        <rect key={i} x="30" y={y} width={i % 3 === 0 ? 120 : 110} height="7" fill="#2a2a2a" />
      ))}

      {/* Text line placeholders — right column */}
      {[90, 105, 120, 135, 150, 165].map((y, i) => (
        <rect key={i} x="175" y={y} width={i % 2 === 0 ? 110 : 100} height="7" fill="#2a2a2a" />
      ))}

      {/* Flame silhouette at bottom of newspaper */}
      <path
        d="M 20 200 Q 40 175 60 190 Q 80 160 100 180 Q 120 150 140 175 Q 160 145 180 170 Q 200 150 220 172 Q 240 158 260 175 Q 280 162 300 178 L 300 240 L 20 240 Z"
        fill="#cc0000"
        opacity="0.85"
      />
      <path
        d="M 20 215 Q 50 195 80 205 Q 110 185 140 200 Q 170 182 200 198 Q 230 185 260 196 Q 285 188 300 195 L 300 240 L 20 240 Z"
        fill="#ff6600"
        opacity="0.6"
      />
      <path
        d="M 40 225 Q 80 210 120 220 Q 160 208 200 218 Q 240 208 280 218 L 300 240 L 20 240 Z"
        fill="#ffd700"
        opacity="0.4"
      />

      {/* SILENCED diagonal stamp */}
      <g transform="translate(155,115) rotate(-30)">
        <rect x="-80" y="-18" width="160" height="36" fill="none" stroke="#ffd700" strokeWidth="3" />
        <text
          x="0"
          y="7"
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="bold"
          fontSize="22"
          fill="#ffd700"
          letterSpacing="3"
        >
          SILENCED
        </text>
      </g>
    </svg>
  )
}

// ─── Variant registry ──────────────────────────────────────────────────────

const VARIANTS = [
  ClassifiedDocumentVariant,
  TombstoneSilhouetteVariant,
  BurningNewspaperVariant,
]

// ─── Public component ──────────────────────────────────────────────────────

interface TombstoneGraphicProps {
  seed?: string
  className?: string
}

/**
 * TombstoneGraphic — renders one of 3 SVG tombstone variants, selected
 * deterministically from the seed (typically article ID) so the same article
 * always shows the same graphic across SSR and client renders.
 */
export function TombstoneGraphic({ seed, className = 'w-full max-w-sm mx-auto' }: TombstoneGraphicProps) {
  const index = pickVariant(seed, VARIANTS.length)
  const Variant = VARIANTS[index]
  return <Variant className={className} />
}

export default TombstoneGraphic
