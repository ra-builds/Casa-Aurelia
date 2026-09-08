import { useTranslation } from 'react-i18next'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import ImageReveal from '../ui/ImageReveal'
import { IMAGES } from '../../utils/constants'

export default function PhilosophySection() {
  const { t } = useTranslation()

  return (
    <section className="bg-cream-dark py-24 md:py-36">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <div>
            <Reveal>
              <p className="label-micro">{t('home.philosophy.subtitle')}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="headline-section mt-4">{t('home.philosophy.title')}</h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="lead mt-7">{t('home.philosophy.paragraph1')}</p>
            </Reveal>
            <Reveal delay={0.22}>
              <p className="lead mt-5">{t('home.philosophy.paragraph2')}</p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:ml-auto">
            <ImageReveal
              src={IMAGES.philosophy}
              alt={t('home.philosophy.imageAlt')}
              aspect="aspect-[4/5] lg:w-full lg:max-w-[34rem]"
            />
          </Reveal>
        </div>
      </Container>
    </section>
  )
}