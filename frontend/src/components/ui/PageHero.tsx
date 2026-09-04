import type { ReactNode } from 'react'
import Reveal from './Reveal'
import Container from './Container'

interface Props {
  label?: string
  title: ReactNode
  intro?: ReactNode
  image?: string
  imagePosition?: string
  align?: 'left' | 'center'
  children?: ReactNode
}

/**
 * Editorial hero band used by interior pages. Dark, cinematic, generous
 * whitespace — the brand's chapter openings.
 */
export default function PageHero({
  label,
  title,
  intro,
  image,
  imagePosition = 'center',
  align = 'left',
  children,
}: Props) {
  const centered = align === 'center'

  return (
    <section className="relative overflow-hidden bg-charcoal pt-36 pb-20 text-cream md:pt-44 md:pb-24">
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
          style={{ objectPosition: imagePosition }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/75 via-charcoal/60 to-charcoal/95" />

      <Container className="relative z-10">
        <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
          {label && (
            <Reveal>
              <p className={`label-micro-light ${centered ? 'mx-auto' : ''}`}>{label}</p>
            </Reveal>
          )}
          <Reveal delay={0.08}>
            <h1 className="headline-page mt-5">{title}</h1>
          </Reveal>
          {intro && (
            <Reveal delay={0.16}>
              <p className="lead-light mt-6">{intro}</p>
            </Reveal>
          )}
          {children && <Reveal delay={0.24}>{children}</Reveal>}
        </div>
      </Container>
    </section>
  )
}