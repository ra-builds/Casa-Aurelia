import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

interface Props {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  aspect?: string
  objectPosition?: string
  delay?: number
  duration?: number
  priority?: boolean
  srcSet?: string
  sizes?: string
}

/**
 * Masked editorial image reveal: the frame clips in vertically while the
 * photograph settles from a slight pre-zoom. Feels like a printed page
 * turning into view.
 */
export default function ImageReveal({
  src,
  alt,
  className = '',
  imgClassName = '',
  aspect = 'aspect-[4/3]',
  objectPosition = 'center',
  delay = 0,
  duration = 1.1,
  priority = false,
  srcSet,
  sizes,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-parchment ${aspect} ${className}`}
    >
      <motion.img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        style={{ objectPosition }}
        className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration, delay, ease: EASE }}
      />
      {/* hairline top edge — quiet editorial frame */}
      <motion.div
        className="pointer-events-none absolute inset-0 border border-charcoal/15"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, delay: delay + 0.3 }}
      />
    </div>
  )
}