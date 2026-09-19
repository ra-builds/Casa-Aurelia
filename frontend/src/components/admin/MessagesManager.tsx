import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'
import { adminMessageApi } from '../../services/api'
import { getCurrentLocale } from '../../utils/locale'
import type { ContactMessage } from '../../types'

export default function MessagesManager() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      setMessages(await adminMessageApi.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(getCurrentLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const buildReplyHref = (message: ContactMessage) => {
    const subject = message.subject.trim() || t('admin.messages.replySubjectFallback')
    return `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${subject}`)}`
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <LoadingSpinner />
        <p className="text-sm text-stone">{t('admin.messages.loading')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <p className="label-micro">{t('admin.messages.kicker')}</p>
        <h2 className="mt-2 font-display text-2xl font-medium text-charcoal-light">{t('admin.messages.title')}</h2>
        <p className="mt-1 text-stone text-sm">{t('admin.messages.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
          <button type="button" onClick={loadData} className="btn-link mt-3 text-wine">
            {t('admin.retry')}
          </button>
        </div>
      )}

      {!error && messages.length === 0 ? (
        <div className="card p-12 text-center text-stone">{t('admin.messages.empty')}</div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="card p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="label-micro">{t('admin.messages.name')}</p>
                  <p className="mt-1 font-medium text-charcoal-light">{m.name}</p>
                  <a
                    href={`mailto:${m.email}`}
                    className="text-sm text-gold-deep hover:underline"
                  >
                    {m.email}
                  </a>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="label-micro">{t('admin.messages.date')}</p>
                  <time className="mt-1 text-sm text-stone whitespace-nowrap" dateTime={m.created_at}>
                    {formatDateTime(m.created_at)}
                  </time>
                </div>
              </div>
              <div className="mt-4">
                <p className="label-micro">{t('admin.messages.subject')}</p>
                <p className="mt-1 font-medium text-charcoal-light">{m.subject}</p>
              </div>
              <div className="mt-4">
                <p className="label-micro">{t('admin.messages.message')}</p>
                <p className="mt-1 text-sm text-stone whitespace-pre-line">{m.message}</p>
              </div>
              <div className="mt-5">
                <a
                  href={buildReplyHref(m)}
                  className="btn-link text-wine"
                  aria-label={`${t('admin.messages.reply')}: ${m.name}`}
                >
                  {t('admin.messages.reply')}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
