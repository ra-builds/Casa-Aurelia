import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Button from '../ui/Button'
import { IMAGES } from '../../utils/constants'
import type { Restaurant } from '../../types'

interface Props {
  restaurant: Restaurant | null
}

export default function HeroSection({ restaurant }: Props) {
  const { t } = useTranslation()

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${IMAGES.hero})` }}
        role="img"
        aria-label={t('home.hero.ariaLabel')}
      />
      <div className="absolute inset-0 bg-charcoal/60" />
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-gold text-sm uppercase tracking-[0.3em] mb-4"
        >
          {restaurant ? `${restaurant.city}, ${restaurant.country}` : ''}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold text-cream mb-6"
        >
          {restaurant?.name ?? ''}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-cream/90 text-lg md:text-xl font-light mb-10 max-w-2xl mx-auto"
        >
          {restaurant?.tagline ?? ''}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button to="/reservations" variant="gold">{t('home.bookTable')}</Button>
          <Button to="/menu" variant="secondaryLight">
            {t('home.viewMenu')}
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
