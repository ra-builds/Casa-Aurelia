interface Props {
  title: string
  subtitle?: string
  centered?: boolean
  light?: boolean
}

export default function SectionHeading({ title, subtitle, centered = true, light = false }: Props) {
  return (
    <div className={centered ? 'text-center' : ''}>
      {subtitle && (
        <p className="section-subheading">{subtitle}</p>
      )}
      <h2 className={`section-heading ${light ? 'text-cream' : ''}`}>{title}</h2>
    </div>
  )
}
