import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'

export default function ReservationCtaSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-28 bg-wine text-cream text-center">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-display text-4xl md:text-5xl font-semibold mb-6">
          {t('home.cta.title')}
        </h2>
        <p className="text-cream/80 mb-10 leading-relaxed">
          {t('home.cta.description')}
        </p>
        <Button to="/reservations" variant="gold">{t('home.cta.button')}</Button>
      </div>
    </section>
  )
}
