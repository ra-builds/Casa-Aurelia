import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Button from '../ui/Button'
import SectionHeading from '../ui/SectionHeading'
import { SIGNATURE_DISHES } from '../../utils/constants'

export default function SignatureDishesSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 bg-cream-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t('home.signatureDishes.title')} subtitle={t('home.signatureDishes.subtitle')} />
        <div className="mt-14 grid md:grid-cols-3 gap-8">
          {SIGNATURE_DISHES.map((dish, i) => (
            <motion.div
              key={dish.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="overflow-hidden">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-full h-64 object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 className="font-display text-xl font-semibold mt-4">{dish.name}</h3>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button to="/menu" variant="primary">{t('home.signatureDishes.exploreMenu')}</Button>
        </div>
      </div>
    </section>
  )
}
