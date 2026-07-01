import Link from 'next/link'

// Root 404 — rendered inside the root layout's <html>/<body>.
// Kept locale-agnostic (links to the default locale) since an unmatched route
// has no reliable locale context.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-kob-black px-6 text-center">
      <p className="font-display text-6xl font-bold text-kob-red">404</p>
      <h1 className="font-display text-2xl font-bold text-kob-white">
        Page not found
      </h1>
      <p className="max-w-md text-sm text-kob-muted">
        The page you are looking for doesn’t exist or has been moved.
      </p>
      <Link
        href="/nl"
        className="bg-kob-red px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-kob-white transition-colors hover:bg-kob-red-dark"
      >
        Back to home
      </Link>
    </main>
  )
}
