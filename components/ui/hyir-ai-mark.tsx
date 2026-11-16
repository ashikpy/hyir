'use client'

import type { CSSProperties } from 'react'
import Silk from './silk'
import { HYIR_AI_SHAPE, HYIR_AI_STRIPES } from './hyr-logo'

const mask = 'url(/hyir-ai.svg)'
// Matches the padded viewBox of /hyir-ai.svg so the rim lines up with the mask.
const VIEWBOX = '-8 -16 266 266'

/**
 * Hyir AI mark: React Bits Silk clipped to the logo, plus a thin solid rim so the silhouette stays readable where the silk goes dark.
 */
export function HyirAiMark({
  className,
  style,
  speed = 5,
  intro = true,
  rim = true,
  scale = 0.6,
  rimPx,
}: {
  className?: string
  style?: CSSProperties
  speed?: number
  intro?: boolean
  rim?: boolean
  /** Silk pattern zoom; lower = bigger folds. Small marks need a higher value to show folds. */
  scale?: number
  /** Fixed rim width in screen pixels. Use for small marks, where the default rim scales down to nothing. */
  rimPx?: number
}) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0c0b10',
          WebkitMaskImage: mask,
          maskImage: mask,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      >
        <Silk
          color="#65acfc"
          scale={scale}
          depth={0.2}
          sheen={0.9}
          glow={0.6}
          speed={speed}
          intro={intro}
        />
      </div>

      {rim && (
        <svg viewBox={VIEWBOX} className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
          {rimPx ? (
            <>
              <path d={HYIR_AI_SHAPE} stroke="#2F4D6F" strokeWidth={rimPx} vectorEffect="non-scaling-stroke" />
              <path d={HYIR_AI_STRIPES} stroke="#2F4D6F" strokeWidth={rimPx * 0.75} vectorEffect="non-scaling-stroke" />
            </>
          ) : (
            <>
              <path d={HYIR_AI_SHAPE} stroke="#2F4D6F" strokeWidth="1.5" />
              <path d={HYIR_AI_STRIPES} stroke="#2F4D6F" strokeWidth="1" />
            </>
          )}
        </svg>
      )}
    </div>
  )
}
