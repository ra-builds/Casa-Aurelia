import Reveal from './Reveal'

interface Props {
  title: string
  subtitle?: string
  centered?: boolean
  light?: boolean
  align?: 'left' | 'center'
}

export default function SectionHeading({
  title,
  subtitle,
  centered = true,
  light = false,
  align,
}: Props) {
  const isCentered = align ? align === 'center' : centered

  return (
    <div className={isCentered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {subtitle && (
        <Reveal>
          <p className={`${light ? 'label-micro-light' : 'label-micro'} ${isCentered ? 'mx-auto' : ''}`}>
            {subtitle}
          </p>
        </Reveal>
      )}
      <Reveal delay={0.07}>
        <h2 className={`headline-section mt-4 ${light ? '!text-cream' : ''}`}>{title}</h2>
      </Reveal>
    </div>
  )
}