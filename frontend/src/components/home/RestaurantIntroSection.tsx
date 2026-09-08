import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import ImageReveal from '../ui/ImageReveal'
import { IMAGES } from '../../utils/constants'

export default function RestaurantIntroSection() {
  const { t } = useTranslation()

  return (
    <section className="py-24 md:py-36">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <div>
            <Reveal>
              <p className="label-micro">{t('home.intro.subtitle')}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="headline-section mt-4">{t('home.intro.title')}</h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="lead mt-7">{t('home.intro.paragraph1')}</p>
            </Reveal>
            <Reveal delay={0.22}>
              <p className="lead mt-5">{t('home.intro.paragraph2')}</p>
            </Reveal>
            <Reveal delay={0.28}>
              <Link to="/about" className="btn-link mt-10 text-wine">
                {t('home.intro.ourStory')} <span aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:ml-auto">
            <ImageReveal
              src={IMAGES.intro}
              alt={t('home.intro.imageAlt')}
              aspect="aspect-[4/5] lg:w-full lg:max-w-[34rem]"
            />
          </Reveal>
        </div>
      </Container>
    </section>
  )
}