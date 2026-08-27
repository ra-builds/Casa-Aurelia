import { useTranslation } from 'react-i18next'

interface Props {
  className?: string
}

export default function LoadingSpinner({ className = '' }: Props) {
  const { t } = useTranslation()

  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label={t('common.loading')}>
      <div className="w-8 h-8 border-2 border-wine/20 border-t-wine rounded-full animate-spin" />
    </div>
  )
}
