import LoadingSpinner from './LoadingSpinner'

/**
 * Elegant Suspense fallback for lazy-loaded routes. Rendered in the content
 * area (Navbar/Footer stay visible via the MainLayout boundary) or as a
 * full-page fallback for the standalone admin route. Keeps the transient
 * loading state consistent with the luxury cream/champagne editorial palette
 * instead of a plain white flash.
 */
export default function PageLoader() {
  return (
    <div className="flex min-h-[65vh] w-full items-center justify-center bg-cream">
      <LoadingSpinner className="py-24" />
    </div>
  )
}
