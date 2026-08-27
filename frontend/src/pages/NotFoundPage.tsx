import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('pageTitles.notFound')

  return (
    <section className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4">404</p>
        <h1 className="font-display text-5xl md:text-6xl font-semibold mb-4">
          Page Not Found
        </h1>
        <p className="text-stone mb-10 max-w-md mx-auto">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Button to="/" variant="primary">Return Home</Button>
        <p className="mt-6">
          <Link to="/menu" className="text-wine text-sm hover:underline">
            View our menu
          </Link>
        </p>
      </div>
    </section>
  )
}
