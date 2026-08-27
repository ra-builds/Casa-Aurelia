import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import SectionHeading from '../ui/SectionHeading'
import { IMAGES } from '../../utils/constants'

export default function StorySection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionHeading
              title={t('about.heroTitle')}
              subtitle={t('about.heroSubtitle')}
              centered={false}
            />
            <p className="mt-6 text-stone leading-relaxed">
              {t('about.story.p1')}
            </p>
            <p className="mt-4 text-stone leading-relaxed">
              {t('about.story.p2')}
            </p>
            <div className="mt-8">
              <Button to="/about" variant="primary">{t('nav.about')}</Button>
            </div>
          </div>
          <img
            src={IMAGES.aboutHero}
            alt=""
            className="w-full h-[400px] md:h-[500px] object-cover shadow-xl"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}
