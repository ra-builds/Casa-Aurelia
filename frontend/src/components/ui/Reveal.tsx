import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

interface Props {
  children: ReactNode
  delay?: number
  y?: number
  duration?: number
  className?: string
  once?: boolean
}

/**
 * Editorial reveal wrapper: slow fade + gentle rise when the element enters
 * the viewport. Runs once. Reduced-motion users are handled by the global
 * <MotionConfig reducedMotion="user">, which removes transform animations.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  duration = 0.9,
  className,
  once = true,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.25 }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}