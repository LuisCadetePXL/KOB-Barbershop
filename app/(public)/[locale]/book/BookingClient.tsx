'use client'

import { Fragment, useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { getAvailableSlots, createAppointment } from './actions'
import type { Barber, Service } from '@/types/database'

type BookingService = Pick<Service, 'id' | 'name_en' | 'description_en' | 'price' | 'duration_minutes'>
type BookingBarber  = Pick<Barber,  'id' | 'name' | 'photo_url' | 'is_owner'>

type Step = 'service' | 'barber' | 'datetime' | 'contact' | 'confirm' | 'done'

interface Selection {
  service: BookingService | null
  barber:  BookingBarber  | null
  date:    string
  time:    string
  name:    string
  phone:   string
}

const ORDERED_STEPS: Step[] = ['service', 'barber', 'datetime', 'contact', 'confirm']

const BTN_PRIMARY =
  'rounded bg-kob-red px-5 py-2.5 text-sm font-medium uppercase tracking-widest text-white hover:bg-kob-red-dark disabled:opacity-50 transition-colors'
const BTN_GHOST =
  'rounded border border-kob-border px-4 py-2 text-sm text-kob-muted hover:text-kob-white transition-colors'

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  const t = useTranslations('book')
  const labels = [
    t('steps.service'),
    t('steps.barber'),
    t('steps.datetime'),
    t('steps.contact'),
    t('steps.confirm'),
  ]
  const currentIndex = ORDERED_STEPS.indexOf(step)

  return (
    <div className="flex items-start gap-1 mb-10">
      {ORDERED_STEPS.map((s, i) => (
        <Fragment key={s}>
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < currentIndex
                  ? 'bg-kob-red text-white'
                  : i === currentIndex
                  ? 'bg-kob-red text-white shadow-[0_0_0_3px_#141414,0_0_0_5px_#C41E3A]'
                  : 'bg-kob-surface text-kob-muted'
              }`}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span
              className={`hidden sm:block text-center text-[10px] leading-tight max-w-[56px] ${
                i === currentIndex ? 'text-kob-white' : 'text-kob-muted'
              }`}
            >
              {labels[i]}
            </span>
          </div>
          {i < ORDERED_STEPS.length - 1 && (
            <div
              className={`mt-3.5 h-px flex-1 transition-colors ${
                i < currentIndex ? 'bg-kob-red' : 'bg-kob-border'
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

// ─── Step 1: Service ───────────────────────────────────────────────────────────

function ServiceStep({
  services,
  onSelect,
}: {
  services: BookingService[]
  onSelect: (s: BookingService) => void
}) {
  const t = useTranslations('book')

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-kob-white mb-6">
        {t('service.heading')}
      </h2>
      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="flex items-center justify-between gap-4 rounded-lg border border-kob-border bg-kob-black p-4 text-left transition-colors hover:border-kob-red hover:bg-kob-surface"
          >
            <div className="min-w-0">
              <p className="font-medium text-kob-white">{service.name_en}</p>
              {service.description_en && (
                <p className="mt-0.5 text-sm text-kob-muted line-clamp-1">
                  {service.description_en}
                </p>
              )}
              <p className="mt-1 text-xs text-kob-muted">
                {service.duration_minutes} {t('service.minutes')}
              </p>
            </div>
            <span className="shrink-0 font-display text-lg font-bold text-kob-red">
              €{Number(service.price).toFixed(2)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Barber ────────────────────────────────────────────────────────────

function BarberStep({
  barbers,
  onSelect,
  onBack,
}: {
  barbers: BookingBarber[]
  onSelect: (b: BookingBarber) => void
  onBack: () => void
}) {
  const t = useTranslations('book')

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-kob-white mb-6">
        {t('barber.heading')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => onSelect(barber)}
            className="flex flex-col items-center gap-3 rounded-lg border border-kob-border bg-kob-black p-4 text-center transition-colors hover:border-kob-red hover:bg-kob-surface"
          >
            {barber.photo_url ? (
              <Image
                src={barber.photo_url}
                alt={barber.name}
                width={64}
                height={64}
                unoptimized
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-kob-surface text-kob-muted text-2xl font-bold">
                {barber.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-kob-white">{barber.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <button onClick={onBack} className={BTN_GHOST}>{t('back')}</button>
      </div>
    </div>
  )
}

// ─── Step 3: Date + time ───────────────────────────────────────────────────────

function DateTimeStep({
  barberId,
  durationMinutes,
  today,
  initialDate,
  slotTakenError,
  onSelect,
  onBack,
}: {
  barberId: string
  durationMinutes: number
  today: string
  initialDate: string
  slotTakenError: boolean
  onSelect: (date: string, time: string) => void
  onBack: () => void
}) {
  const t = useTranslations('book')
  const [date, setDate] = useState(initialDate)
  const [slots, setSlots] = useState<string[]>([])
  const [closed, setClosed] = useState(false)
  const [loading, setLoading] = useState(false)

  // When coming back after a slot_taken error the date is already set —
  // auto-fetch to show the refreshed availability immediately.
  useEffect(() => {
    if (initialDate) void fetchSlots(initialDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchSlots(d: string) {
    setLoading(true)
    setSlots([])
    setClosed(false)
    const result = await getAvailableSlots(barberId, d, durationMinutes)
    setLoading(false)
    setClosed(result.closed)
    setSlots(result.slots)
  }

  async function handleDateChange(newDate: string) {
    setDate(newDate)
    if (newDate) await fetchSlots(newDate)
    else { setSlots([]); setClosed(false) }
  }

  const dateSelected = !!date

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-kob-white mb-6">
        {t('datetime.heading')}
      </h2>

      {slotTakenError && (
        <div className="mb-5 rounded border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {t('confirm.slotTaken')}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-xs font-medium text-kob-muted mb-1">
          {t('datetime.dateLabel')}
        </label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white focus:border-kob-red focus:outline-none"
        />
      </div>

      {loading && (
        <p className="text-sm text-kob-muted">{t('datetime.loading')}</p>
      )}

      {!loading && dateSelected && closed && (
        <p className="text-sm text-kob-muted">{t('datetime.closedDay')}</p>
      )}

      {!loading && dateSelected && !closed && slots.length === 0 && (
        <p className="text-sm text-kob-muted">{t('datetime.noSlots')}</p>
      )}

      {!loading && slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => onSelect(date, slot)}
              className="rounded border border-kob-border py-2.5 text-sm text-kob-white transition-colors hover:border-kob-red hover:bg-kob-surface"
            >
              {slot}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <button onClick={onBack} className={BTN_GHOST}>{t('back')}</button>
      </div>
    </div>
  )
}

// ─── Step 4: Contact details ───────────────────────────────────────────────────

// Accepts Belgian mobile/fixed (04xx…, 0x…) and international (+32…, +31…, etc.)
// Strips spaces, dashes, dots before checking — so "+32 476 00 00 00" passes fine.
// Phase 9 (WhatsApp) needs E.164 format; the hint in the placeholder guides the user.
function isValidPhone(raw: string): boolean {
  const stripped = raw.replace(/[\s\-\.\(\)]/g, '')
  return /^\+?[0-9]{9,15}$/.test(stripped)
}

function ContactStep({
  initialName,
  initialPhone,
  onSubmit,
  onBack,
}: {
  initialName: string
  initialPhone: string
  onSubmit: (name: string, phone: string) => void
  onBack: () => void
}) {
  const t = useTranslations('book')
  const [name, setName]       = useState(initialName)
  const [phone, setPhone]     = useState(initialPhone)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const INPUT = 'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none'
  const INPUT_ERROR = 'w-full rounded border border-red-700 bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-red-500 focus:outline-none'
  const LABEL = 'block text-xs font-medium text-kob-muted mb-1'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidPhone(phone)) {
      setPhoneError(t('contact.phoneError'))
      return
    }
    setPhoneError(null)
    onSubmit(name.trim(), phone.trim())
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-kob-white mb-6">
        {t('contact.heading')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL}>{t('contact.nameLabel')} *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('contact.namePlaceholder')}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>{t('contact.phoneLabel')} *</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPhoneError(null) }}
            placeholder={t('contact.phonePlaceholder')}
            className={phoneError ? INPUT_ERROR : INPUT}
          />
          {phoneError && (
            <p className="mt-1 text-xs text-red-400">{phoneError}</p>
          )}
          <p className="mt-1 text-xs text-kob-muted">{t('contact.phoneHint')}</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className={BTN_PRIMARY}>{t('next')}</button>
          <button type="button" onClick={onBack} className={BTN_GHOST}>{t('back')}</button>
        </div>
      </form>
    </div>
  )
}

// ─── Step 5: Confirm ───────────────────────────────────────────────────────────

function ConfirmStep({
  selection,
  locale,
  onBack,
  onConfirmed,
  onSlotTaken,
}: {
  selection: Selection
  locale: string
  onBack: () => void
  onConfirmed: () => void
  onSlotTaken: () => void
}) {
  const t = useTranslations('book')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const localeTag = locale === 'nl' ? 'nl-BE' : locale === 'es' ? 'es-ES' : 'en-GB'
  const dateLabel = selection.date
    ? new Date(selection.date + 'T12:00:00Z').toLocaleDateString(localeTag, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  const rows: [string, string][] = [
    [t('confirm.service'), `${selection.service?.name_en} — €${Number(selection.service?.price).toFixed(2)}`],
    [t('confirm.barber'),  selection.barber?.name ?? ''],
    [t('confirm.date'),    dateLabel],
    [t('confirm.time'),    selection.time],
    [t('confirm.name'),    selection.name],
    [t('confirm.phone'),   selection.phone],
  ]

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await createAppointment({
        barberId:       selection.barber!.id,
        serviceId:      selection.service!.id,
        date:           selection.date,
        time:           selection.time,
        durationMinutes: selection.service!.duration_minutes,
        customerName:   selection.name,
        customerPhone:  selection.phone,
      })

      if (result.error === 'slot_taken') {
        onSlotTaken()
      } else if (result.error) {
        setError(result.error)
      } else {
        onConfirmed()
      }
    })
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-kob-white mb-6">
        {t('confirm.heading')}
      </h2>

      <dl className="mb-6 divide-y divide-kob-border overflow-hidden rounded-lg border border-kob-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-2 gap-4 bg-kob-black px-4 py-3">
            <dt className="text-xs text-kob-muted">{label}</dt>
            <dd className="text-sm text-kob-white">{value}</dd>
          </div>
        ))}
      </dl>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className={BTN_PRIMARY}
        >
          {isPending ? t('confirm.submitting') : t('confirm.submit')}
        </button>
        <button onClick={onBack} disabled={isPending} className={BTN_GHOST}>
          {t('back')}
        </button>
      </div>
    </div>
  )
}

// ─── Step 6: Done ─────────────────────────────────────────────────────────────

function DoneStep({ sel, locale }: { sel: Selection; locale: string }) {
  const t = useTranslations('book')

  const dateLabel = sel.date
    ? new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Brussels',
      }).format(new Date(sel.date + 'T12:00:00Z'))
    : ''

  const rows = [
    { label: t('done.summaryService'), value: sel.service?.name_en },
    { label: t('done.summaryBarber'),  value: sel.barber?.name },
    { label: t('done.summaryDate'),    value: dateLabel },
    { label: t('done.summaryTime'),    value: sel.time },
  ]

  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-kob-red">
        <span className="text-2xl text-white">✓</span>
      </div>
      <h2 className="font-display text-2xl font-bold text-kob-white mb-3">
        {t('done.heading')}
      </h2>
      <p className="text-kob-muted mb-6 max-w-xs mx-auto">{t('done.body')}</p>

      <dl className="mx-auto mb-8 max-w-xs rounded-lg border border-kob-border bg-kob-black/40 text-left divide-y divide-kob-border">
        {rows.map(({ label, value }) =>
          value ? (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-xs text-kob-muted">{label}</dt>
              <dd className="text-sm text-kob-white text-right">{value}</dd>
            </div>
          ) : null
        )}
      </dl>

      <Link href="/" className={BTN_PRIMARY}>
        {t('done.backHome')}
      </Link>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'kob_booking'

export default function BookingClient({
  services,
  barbers,
  locale,
  today,
}: {
  services: BookingService[]
  barbers:  BookingBarber[]
  locale:   string
  today:    string
}) {
  const t = useTranslations('book')

  const [step, setStep] = useState<Step>('service')
  const [slotTakenError, setSlotTakenError] = useState(false)
  const [sel, setSel] = useState<Selection>({
    service: null, barber: null, date: '', time: '', name: '', phone: '',
  })
  // Tracks whether the restore-from-sessionStorage effect has run.
  // The persist effect is gated on this so it doesn't overwrite saved state
  // with the empty initial state on first render.
  const [restored, setRestored] = useState(false)

  // Restore wizard state from sessionStorage on mount (survives tab switches).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const { step: s, sel: savedSel } = JSON.parse(raw) as { step: Step; sel: Selection }
        if (s && s !== 'done') setStep(s)
        if (savedSel) setSel(savedSel)
      }
    } catch {
      // sessionStorage unavailable or corrupt — start fresh
    }
    setRestored(true)
  }, [])

  // Persist wizard state on every change (after restore is complete).
  useEffect(() => {
    if (!restored) return
    if (step === 'done') {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, sel }))
    } catch {
      // sessionStorage full or unavailable — continue without persistence
    }
  }, [step, sel, restored])

  // When the EXCLUDE constraint fires during confirm, we come back here:
  // re-set the step to datetime so the user can pick a new slot.
  function handleSlotTaken() {
    setSlotTakenError(true)
    setSel((prev) => ({ ...prev, time: '' }))
    setStep('datetime')
  }

  return (
    <>
      {/* Page header — same pattern as other public pages */}
      <div className="border-b border-kob-border bg-kob-dark py-14 text-center">
        <h1 className="font-display text-4xl font-bold text-kob-white sm:text-5xl">
          {t('pageTitle')}
        </h1>
      </div>

      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        {step !== 'done' && <ProgressBar step={step} />}

        <div className="rounded-lg border border-kob-border bg-kob-dark p-6 sm:p-8">
          {step === 'service' && (
            <ServiceStep
              services={services}
              onSelect={(service) => {
                // Changing service resets all downstream selections
                setSel({ service, barber: null, date: '', time: '', name: sel.name, phone: sel.phone })
                setStep('barber')
              }}
            />
          )}

          {step === 'barber' && (
            <BarberStep
              barbers={barbers}
              onSelect={(barber) => {
                // Changing barber resets date + time (availability differs per barber)
                setSel((prev) => ({ ...prev, barber, date: '', time: '' }))
                setSlotTakenError(false)
                setStep('datetime')
              }}
              onBack={() => setStep('service')}
            />
          )}

          {step === 'datetime' && (
            <DateTimeStep
              barberId={sel.barber!.id}
              durationMinutes={sel.service!.duration_minutes}
              today={today}
              initialDate={sel.date}
              slotTakenError={slotTakenError}
              onSelect={(date, time) => {
                setSlotTakenError(false)
                setSel((prev) => ({ ...prev, date, time }))
                setStep('contact')
              }}
              onBack={() => {
                setSlotTakenError(false)
                setStep('barber')
              }}
            />
          )}

          {step === 'contact' && (
            <ContactStep
              initialName={sel.name}
              initialPhone={sel.phone}
              onSubmit={(name, phone) => {
                setSel((prev) => ({ ...prev, name, phone }))
                setStep('confirm')
              }}
              onBack={() => {
                setSlotTakenError(false)
                setStep('datetime')
              }}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              selection={sel}
              locale={locale}
              onBack={() => setStep('contact')}
              onConfirmed={() => setStep('done')}
              onSlotTaken={handleSlotTaken}
            />
          )}

          {step === 'done' && <DoneStep sel={sel} locale={locale} />}
        </div>
      </section>
    </>
  )
}
