import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  to?: string
  variant?: 'primary' | 'secondary' | 'secondaryLight' | 'gold'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
  ariaLabel?: string
}

export default function Button({
  children,
  to,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled,
  onClick,
  ariaLabel,
}: Props) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    secondaryLight: 'btn-secondary-light',
    gold: 'btn-gold',
  }

  const classes = `${variants[variant]} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}