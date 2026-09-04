import { useTranslation } from 'react-i18next'

interface Props {
  message?: string
}

export default function ErrorMessage({ message }: Props) {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className="border-l-2 border-wine bg-wine/5 px-5 py-3.5 text-sm text-wine-deep"
    >
      {message || t('common.defaultError')}
    </div>
  )
}