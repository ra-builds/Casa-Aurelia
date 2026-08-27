import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

function FallbackContent() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm" role="alert">
          {t('common.errorBoundaryMessage')}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 btn-primary"
        >
          {t('common.errorBoundaryReload')}
        </button>
      </div>
    </div>
  )
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    console.error('Unhandled application error:', _error, _info)
  }

  render() {
    if (this.state.hasError) {
      return <FallbackContent />
    }
    return this.props.children
  }
}

export default ErrorBoundary
