import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  size?: 'site' | 'narrow'
}

export default function Container({ children, className = '', size = 'site' }: Props) {
  return (
    <div className={`${size === 'narrow' ? 'container-narrow' : 'container-site'} ${className}`}>
      {children}
    </div>
  )
}