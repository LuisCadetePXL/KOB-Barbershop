'use client'

import { useRef, useState, useTransition } from 'react'
import { updateBusinessSettings } from './actions'
import type { BusinessSettings } from '@/types/database'

type Props = {
  settings: Pick<BusinessSettings, 'phone' | 'address' | 'instagram_url'> | null
}

export default function SettingsClient({ settings }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateBusinessSettings(data)
      if (result.error) {
        setError(result.error)
        setSaved(false)
      } else {
        setError(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-kob-white">Business Settings</h1>
        <p className="mt-1 text-sm text-kob-muted">
          Contact info displayed on the public website.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field
          label="Phone number"
          name="phone"
          defaultValue={settings?.phone ?? ''}
          placeholder="+32 476 00 00 00"
          hint="Shown on the contact page."
        />

        <Field
          label="Address"
          name="address"
          defaultValue={settings?.address ?? ''}
          placeholder="Maarschalk Fochstraat 5, 3970 Leopoldsburg"
          hint="Shown on the contact page and in the footer."
        />

        <Field
          label="Instagram URL"
          name="instagram_url"
          defaultValue={settings?.instagram_url ?? ''}
          placeholder="https://www.instagram.com/king_of_barber_belgium"
          hint="Full URL including https://"
        />

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-kob-red px-6 py-2.5 text-sm font-semibold uppercase tracking-widest text-kob-white transition-colors hover:bg-kob-red-dark disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>

          {saved && (
            <span className="text-sm text-green-400">Saved!</span>
          )}
          {error && (
            <span className="text-sm text-red-400">{error}</span>
          )}
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string
  name: string
  defaultValue: string
  placeholder: string
  hint: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-kob-white">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="border border-kob-border bg-kob-dark px-4 py-2.5 text-sm text-kob-white placeholder:text-kob-border focus:border-kob-red focus:outline-none"
      />
      <p className="text-xs text-kob-muted">{hint}</p>
    </div>
  )
}
