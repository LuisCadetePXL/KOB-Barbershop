'use client'

import { useRef, useState, useTransition } from 'react'
import { addService, deleteService, updateService } from './actions'
import type { Service } from '@/types/database'

const INPUT =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none'
const TEXTAREA =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none resize-none'
const BTN_PRIMARY =
  'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'
const BTN_GHOST =
  'rounded border border-kob-border px-3 py-1.5 text-sm text-kob-muted hover:text-kob-white'
const BTN_DANGER =
  'rounded border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20'
const LABEL = 'block text-xs font-medium text-kob-muted mb-1'

function ServiceFields({ service }: { service?: Service }) {
  return (
    <>
      <input type="hidden" name="id" value={service?.id ?? ''} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Name (EN) *</label>
          <input name="name_en" required defaultValue={service?.name_en} placeholder="e.g. Classic Haircut" className={INPUT} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Description (EN)</label>
          <textarea name="description_en" rows={2} defaultValue={service?.description_en ?? ''} placeholder="Short description in English…" className={TEXTAREA} />
        </div>
        <div>
          <label className={LABEL}>Description (NL)</label>
          <textarea name="description_nl" rows={2} defaultValue={service?.description_nl ?? ''} placeholder="Korte beschrijving in het Nederlands…" className={TEXTAREA} />
        </div>
        <div>
          <label className={LABEL}>Description (ES)</label>
          <textarea name="description_es" rows={2} defaultValue={service?.description_es ?? ''} placeholder="Descripción breve en español…" className={TEXTAREA} />
        </div>
        <div>
          <label className={LABEL}>Price (€) *</label>
          <input name="price" type="number" step="0.01" min="0.01" required defaultValue={service?.price} placeholder="0.00" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Duration (min) *</label>
          <input name="duration_minutes" type="number" min="1" required defaultValue={service?.duration_minutes} placeholder="30" className={INPUT} />
        </div>
      </div>
    </>
  )
}

function EditForm({ service, onCancel }: { service: Service; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateService(null, new FormData(e.currentTarget))
      if (result.error) setError(result.error)
      else onCancel()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
      <div className="rounded-lg border border-kob-border bg-kob-black p-4 space-y-3">
        <ServiceFields service={service} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

function AddForm({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      const result = await addService(null, new FormData(e.currentTarget))
      if (result.error) setError(result.error)
      else { formRef.current?.reset(); onClose() }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="rounded-lg border border-kob-red/40 bg-kob-black p-4 space-y-3 mb-4">
      <p className="text-sm font-medium text-kob-white">New service</p>
      <ServiceFields />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Adding…' : 'Add service'}
        </button>
        <button type="button" onClick={onClose} className={BTN_GHOST}>Cancel</button>
      </div>
    </form>
  )
}

export default function ServicesClient({ services }: { services: Service[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete(id: string) {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteService(id)
      if (result.error) setDeleteError(result.error)
      else setConfirmDeleteId(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-kob-white">Services & Prices</h1>
        <button onClick={() => { setShowAdd(true); setEditingId(null) }} className={BTN_PRIMARY}>
          + Add service
        </button>
      </div>

      {showAdd && <AddForm onClose={() => setShowAdd(false)} />}

      {deleteError && (
        <p className="mb-4 text-sm text-red-400 rounded border border-red-800 px-3 py-2 bg-red-900/10">
          {deleteError}
        </p>
      )}

      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {services.length === 0 && (
          <p className="p-6 text-kob-muted text-sm">No services yet. Add one above.</p>
        )}
        {services.map((service, i) => (
          <div key={service.id} className={i > 0 ? 'border-t border-kob-border' : ''}>
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-kob-white">{service.name_en}</p>
                <p className="text-xs text-kob-muted">
                  €{Number(service.price).toFixed(2)} · {service.duration_minutes} min
                  {service.description_en && ` · ${service.description_en}`}
                </p>
              </div>
              {confirmDeleteId === service.id ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-kob-muted text-xs">Delete?</span>
                  <button
                    disabled={isPending}
                    onClick={() => handleDelete(service.id)}
                    className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    {isPending ? '…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} className={BTN_GHOST}>Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(editingId === service.id ? null : service.id); setShowAdd(false) }}
                    className={BTN_GHOST}
                  >
                    {editingId === service.id ? 'Close' : 'Edit'}
                  </button>
                  <button onClick={() => { setConfirmDeleteId(service.id); setEditingId(null) }} className={BTN_DANGER}>
                    Delete
                  </button>
                </div>
              )}
            </div>
            {editingId === service.id && (
              <EditForm service={service} onCancel={() => setEditingId(null)} />
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
