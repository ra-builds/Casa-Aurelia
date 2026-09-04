import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'

export default function ReservationCtaSection() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden bg-charcoal py-24 text-center md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-wine-deep/40 via-transparent to-gold-deep/20" />
      <Container className="relative z-10">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <h2 className="headline-section !text-cream">{t('home.cta.title')}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lead-light mt-6">{t('home.cta.description')}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-10">
              <Button to="/reservations" variant="gold">{t('home.cta.button')}</Button>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}