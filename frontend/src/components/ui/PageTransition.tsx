import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Short, tasteful route transition: the outgoing page fades away while the
 * incoming page rises into place. Never slow enough to feel like a loader.
 */
export default function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={location.pathname}
        id="main"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {outlet}
      </motion.main>
    </AnimatePresence>
  )
}