import { useTranslation } from 'react-i18next'

interface Props {
  message?: string
}

export default function ErrorMessage({ message }: Props) {
  const { t } = useTranslation()

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm" role="alert">
      {message || t('common.defaultError')}
    </div>
  )
}
