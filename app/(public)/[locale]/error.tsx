'use client'

import { usePathname } from 'next/navigation'

// Segment error boundary for the public site. Self-contained copy keyed off the
// locale in the URL so it stays robust even if the i18n messages failed to load
// (which could itself be the cause of the error).
const COPY = {
  nl: {
    title: 'Er ging iets mis',
    body: 'Er is een onverwachte fout opgetreden. Probeer het opnieuw.',
    retry: 'Opnieuw proberen',
  },
  en: {
    title: 'Something went wrong',
    body: 'An unexpected error occurred. Please try again.',
    retry: 'Try again',
  },
  es: {
    title: 'Algo salió mal',
    body: 'Se produjo un error inesperado. Inténtalo de nuevo.',
    retry: 'Intentar de nuevo',
  },
} as const

type Locale = keyof typeof COPY

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname()
  const seg = pathname.split('/')[1] as Locale
  const t = COPY[seg] ?? COPY.nl

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-kob-black px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-kob-white">{t.title}</h1>
      <p className="max-w-md text-sm text-kob-muted">{t.body}</p>
      <button
        onClick={reset}
        className="bg-kob-red px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-kob-white transition-colors hover:bg-kob-red-dark"
      >
        {t.retry}
      </button>
    </main>
  )
}
