'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cancelAppointment } from './actions'

export type AppointmentPreview = {
  customerName: string
  serviceName: string
  barberName: string
  dateLabel: string
  timeLabel: string
  price: number
  isLate: boolean
  alreadyCancelled: boolean
  alreadyPast: boolean
  invalidToken: boolean
}

export default function CancelClient({
  token,
  preview,
}: {
  token: string
  preview: AppointmentPreview
}) {
  const t = useTranslations('cancel')
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [lateDone, setLateDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmShown, setConfirmShown] = useState(false)

  const amountOwed = Math.round(preview.price / 2 * 100) / 100

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelAppointment(token)
      if (result.status === 'cancelled') {
        setDone(true)
        setLateDone(result.late)
      } else {
        setServerError(result.message)
      }
    })
  }

  const showError =
    preview.invalidToken || preview.alreadyCancelled || preview.alreadyPast || serverError

  const errorText = serverError
    ? (serverError === 'already_cancelled' ? t('alreadyCancelled')
      : serverError === 'already_past'    ? t('alreadyPast')
      : serverError === 'invalid_token'   ? t('invalidToken')
      : serverError)
    : preview.invalidToken    ? t('invalidToken')
    : preview.alreadyCancelled ? t('alreadyCancelled')
    : preview.alreadyPast     ? t('alreadyPast')
    : null

  return (
    <>
      <PageHeader title={t('pageTitle')} />

      <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">

        {showError && (
          <div className="rounded-lg border border-kob-border bg-kob-dark px-6 py-8 text-center">
            <p className="text-kob-muted">{errorText}</p>
          </div>
        )}

        {done && !showError && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-kob-surface border border-kob-border">
              <span className="text-2xl text-kob-white">✓</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-kob-white mb-3">
              {t('cancelled')}
            </h2>
            <p className="text-kob-muted mb-4">{t('cancelledBody')}</p>
            {lateDone && (
              <p className="mb-6 text-sm text-amber-400 max-w-sm mx-auto">
                {t('lateWarning', { amount: amountOwed.toFixed(2) })}
              </p>
            )}
            <Link
              href="/"
              className="inline-block bg-kob-red px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-kob-red-dark"
            >
              ← Home
            </Link>
          </div>
        )}

        {!showError && !done && (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-kob-red">
              {t('details')}
            </p>

            <dl className="mb-6 divide-y divide-kob-border rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
              {([
                [t('service'), preview.serviceName],
                [t('barber'),  preview.barberName],
                [t('date'),    preview.dateLabel],
                [t('time'),    preview.timeLabel],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="grid grid-cols-2 gap-4 px-5 py-3">
                  <dt className="text-xs text-kob-muted">{label}</dt>
                  <dd className="text-sm text-kob-white">{value}</dd>
                </div>
              ))}
            </dl>

            {preview.isLate ? (
              <div className="mb-6 rounded-lg border border-amber-800/50 bg-amber-900/20 px-5 py-4">
                <p className="text-sm font-semibold text-amber-400 mb-1">
                  {t('lateWarningHeading')}
                </p>
                <p className="text-sm text-amber-200/80">
                  {t('lateWarning', { amount: amountOwed.toFixed(2) })}
                </p>
              </div>
            ) : (
              <p className="mb-6 text-sm text-kob-muted">{t('onTimeInfo')}</p>
            )}

            {!confirmShown ? (
              <button
                onClick={() => setConfirmShown(true)}
                className="w-full bg-kob-red py-3 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-kob-red-dark"
              >
                {preview.isLate ? t('cancelBtnLate') : t('cancelBtn')}
              </button>
            ) : (
              <div className="rounded-lg border border-kob-border bg-kob-surface px-5 py-4">
                <p className="text-sm text-kob-white mb-4">{t('confirmPrompt')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={pending}
                    className="flex-1 bg-kob-red py-2.5 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-kob-red-dark disabled:opacity-50"
                  >
                    {pending ? t('cancelling') : (preview.isLate ? t('cancelBtnLate') : t('cancelBtn'))}
                  </button>
                  <button
                    onClick={() => setConfirmShown(false)}
                    disabled={pending}
                    className="flex-1 border border-kob-border py-2.5 text-sm text-kob-muted transition-colors hover:text-kob-white disabled:opacity-50"
                  >
                    Terug
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-kob-border bg-kob-dark py-14 text-center">
      <h1 className="font-display text-4xl font-bold text-kob-white sm:text-5xl">{title}</h1>
    </div>
  )
}
