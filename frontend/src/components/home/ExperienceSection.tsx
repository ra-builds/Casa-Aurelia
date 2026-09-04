import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import { IMAGES } from '../../utils/constants'

export default function ExperienceSection() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${IMAGES.experience})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/85 via-charcoal/70 to-charcoal/90" />
      <Container className="relative z-10">
        <div className="mx-auto max-w-2xl text-center text-cream">
          <Reveal>
            <p className="label-micro-light">{t('home.experience.subtitle')}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="headline-section mt-4 !text-cream">{t('home.experience.title')}</h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lead-light mt-7">{t('home.experience.paragraph')}</p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-11">
              <Button to="/gallery" variant="gold">{t('home.experience.viewGallery')}</Button>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}