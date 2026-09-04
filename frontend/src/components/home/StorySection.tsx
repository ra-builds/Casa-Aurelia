import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import ImageReveal from '../ui/ImageReveal'
import { IMAGES } from '../../utils/constants'

export default function StorySection() {
  const { t } = useTranslation()

  return (
    <section className="py-24 md:py-36">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <Reveal delay={0.1} className="order-2 lg:order-1">
            <ImageReveal src={IMAGES.aboutHero} alt="" aspect="aspect-[4/5]" />
          </Reveal>
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="label-micro">{t('about.heroSubtitle')}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="headline-section mt-4">{t('about.heroTitle')}</h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="lead mt-7">{t('about.story.p1')}</p>
            </Reveal>
            <Reveal delay={0.22}>
              <p className="lead mt-5">{t('about.story.p2')}</p>
            </Reveal>
            <Reveal delay={0.28}>
              <div className="mt-10">
                <Button to="/about" variant="primary">{t('nav.about')}</Button>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  )
}