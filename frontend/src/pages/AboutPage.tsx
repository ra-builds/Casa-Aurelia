import { useTranslation } from 'react-i18next'
import SectionHeading from '../components/ui/SectionHeading'
import { usePageTitle, useMetaDescription } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { IMAGES } from '../utils/constants'

export default function AboutPage() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  usePageTitle('pageTitles.about')
  useMetaDescription('meta.about')

  return (
    <>
      <section className="relative pt-32 pb-20">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${IMAGES.aboutHero})` }}
        />
        <div className="absolute inset-0 bg-charcoal/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading title={t('about.heroTitle')} subtitle={t('about.heroSubtitle')} light />
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-stone leading-relaxed text-lg">
            {t('about.story.p1')}
          </p>
          <p className="mt-6 text-stone leading-relaxed">
            {t('about.story.p2')}
          </p>
        </div>
      </section>

      <section className="py-20 bg-cream-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <img
              src={IMAGES.chef}
              alt={t('about.chef.imageAlt')}
              className="w-full h-[500px] object-cover"
              loading="lazy"
            />
            <div>
              <SectionHeading title={t('about.chef.title')} subtitle={t('about.chef.subtitle')} centered={false} />
              <p className="mt-6 text-stone leading-relaxed">
                {t('about.chef.p1')}
              </p>
              <p className="mt-4 text-stone leading-relaxed">
                {t('about.chef.p2')}
              </p>
              <p className="mt-4 text-sm text-stone-light italic">{t('about.chef.attribution')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading title={t('about.approach.title')} subtitle={t('about.approach.subtitle')} />
          <div className="mt-14 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-stone leading-relaxed">
                {t('about.approach.p1')}
              </p>
              <p className="mt-4 text-stone leading-relaxed">
                {t('about.approach.p2')}
              </p>
            </div>
            <img
              src={IMAGES.ingredients}
              alt={t('about.approach.imageAlt')}
              className="w-full h-[400px] object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-charcoal text-cream">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-6">
            {t('about.cta.title')}
          </h2>
          <p className="text-cream/80 leading-relaxed">
            {t('about.cta.description', { name: restaurant?.name ?? 'Casa Aurelia' })}
          </p>
        </div>
      </section>
    </>
  )
}
