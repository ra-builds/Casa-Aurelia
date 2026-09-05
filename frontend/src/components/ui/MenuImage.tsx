import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

type Status = 'loading' | 'loaded' | 'error' | 'empty'

interface Props {
  src?: string | null
  alt: string
  aspect?: string
  className?: string
  imgClassName?: string
  objectPosition?: string
  priority?: boolean
  reveal?: boolean
  delay?: number
  sizes?: string
}

const HIDDEN = { opacity: 0, scale: 1.05 }
const OPEN = { opacity: 1, scale: 1 }

/**
 * Robust food photography module with a premium fallback instead of broken
 * icons. While an image loads (or when it is missing / fails), a quiet ivory
 * sheet shows the Casa Aurelia monogram. Once loaded, the photograph fades in
 * from a gentle pre-zoom. Reduced-motion users skip the reveal.
 */
export default function MenuImage({
  src,
  alt,
  aspect = 'aspect-[4/3]',
  className = '',
  imgClassName = '',
  objectPosition = 'center',
  priority = false,
  reveal = true,
  delay = 0,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 96vw',
}: Props) {
  const [status, setStatus] = useState<Status>(() => (src ? 'loading' : 'empty'))
  const reduced = !!useReducedMotion()
  const prevSrcRef = useRef(src)

  useEffect(() => {
    if (prevSrcRef.current === src) return
    prevSrcRef.current = src
    setStatus(src ? 'loading' : 'empty')
  }, [src])

  const loaded = status === 'loaded'
  const showImg = !!src && status !== 'error'
  const animateClip = reveal && !reduced

  return (
    <figure
      className={`relative overflow-hidden bg-parchment ${aspect} ${className}`}
    >
      {showImg && (
        <motion.img
          key={src}
          src={src ?? undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          style={{ objectPosition }}
          className={`absolute inset-0 h-full w-full object-cover will-change-transform ${imgClassName}`}
          initial={animateClip ? HIDDEN : false}
          animate={animateClip ? (loaded ? OPEN : HIDDEN) : false}
          transition={{ duration: 1.1, delay, ease: EASE }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 border border-charcoal/15"
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center bg-ivory/85 transition-opacity duration-700 ${
          loaded ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span className="font-display text-[clamp(0.85rem,1.4vw,1.3rem)] tracking-[0.42em] text-wine/45">
            CASA AURELIA
          </span>
          <span className="h-px w-10 bg-gold/40" aria-hidden="true" />
          <span className="font-display text-[clamp(0.85rem,1.4vw,1.3rem)] tracking-[0.42em] text-wine/45">
            IL MENÙ
          </span>
        </div>
      </div>
    </figure>
  )
}