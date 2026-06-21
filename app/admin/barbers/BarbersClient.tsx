'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import { addBarber, deleteBarber, updateBarber } from './actions'
import type { Barber } from '@/types/database'

const INPUT =
  'w-full rounded border border-kob-border bg-kob-black px-3 py-2 text-sm text-kob-white placeholder:text-kob-muted focus:border-kob-red focus:outline-none'
const BTN_PRIMARY =
  'rounded bg-kob-red px-4 py-2 text-sm font-medium text-white hover:bg-kob-red-dark disabled:opacity-50'
const BTN_GHOST =
  'rounded border border-kob-border px-3 py-1.5 text-sm text-kob-muted hover:text-kob-white'
const BTN_DANGER =
  'rounded border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20'
const LABEL = 'block text-xs font-medium text-kob-muted mb-1'

function Toggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      aria-label={active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-kob-red' : 'bg-kob-border'}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${active ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  )
}

function BarberAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={40}
        height={40}
        // unoptimized bypasses Next.js image cache so updated avatars
        // appear immediately after upload without a hard refresh
        unoptimized
        className="size-10 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-kob-surface text-kob-muted text-sm font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// PhotoInput manages the file picker UI and previews.
// The selected File is passed to the parent via onFileSelect — the file
// never goes through a named DOM input, avoiding FormData/DOM sync issues.
interface PhotoInputProps {
  currentUrl?: string | null
  onFileSelect: (file: File | null) => void
  onRemoveToggle: (removing: boolean) => void
}

function PhotoInput({ currentUrl, onFileSelect, onRemoveToggle }: PhotoInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
      setFileName(file.name)
      setRemoving(false)
      onFileSelect(file)
      onRemoveToggle(false)
    } else {
      setPreviewUrl(null)
      setFileName(null)
      onFileSelect(null)
    }
  }

  function handleCancelNew() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
    onFileSelect(null)
  }

  function handleRemove() {
    handleCancelNew()
    setRemoving(true)
    onRemoveToggle(true)
  }

  const hasExisting = !!currentUrl && !removing
  const showingNew = !!previewUrl
  const displayUrl = previewUrl ?? (hasExisting ? currentUrl : null)

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {removing ? (
        <div className="flex items-center gap-3 rounded border border-amber-700/50 bg-amber-900/10 px-3 py-2">
          <span className="text-xs text-amber-400 flex-1">Photo will be removed on save.</span>
          <button type="button" onClick={() => { setRemoving(false); onRemoveToggle(false) }} className={BTN_GHOST}>
            Undo
          </button>
        </div>
      ) : showingNew ? (
        <div className="flex items-center gap-3">
          {displayUrl && (
            <Image src={displayUrl} alt="Preview" width={56} height={56}
              unoptimized
              className="size-14 rounded-lg object-cover border border-kob-border" />
          )}
          <div className="min-w-0">
            <p className="text-xs text-kob-white truncate max-w-[200px]">{fileName}</p>
            <button type="button" onClick={handleCancelNew} className="text-xs text-kob-muted hover:text-kob-white mt-0.5">
              Cancel selection
            </button>
          </div>
        </div>
      ) : hasExisting ? (
        <div className="flex items-center gap-3">
          <Image src={currentUrl!} alt="Current photo" width={56} height={56}
            unoptimized
            className="size-14 rounded-lg object-cover border border-kob-border" />
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => fileRef.current?.click()} className={BTN_GHOST}>
              Change
            </button>
            <button type="button" onClick={handleRemove}
              className="rounded border border-red-800 px-3 py-1 text-xs text-red-400 hover:bg-red-900/20">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className={BTN_GHOST}>
            Choose photo
          </button>
          <span className="text-xs text-kob-muted">No file chosen</span>
        </div>
      )}
    </div>
  )
}

function EditForm({ barber, onCancel }: { barber: Barber; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(barber.active)
  const [isOwner, setIsOwner] = useState(barber.is_owner)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [removingPhoto, setRemovingPhoto] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('active', active.toString())
    formData.set('is_owner', isOwner.toString())
    if (removingPhoto) {
      formData.set('removePhoto', 'true')
    } else if (selectedPhoto) {
      formData.set('photo', selectedPhoto, selectedPhoto.name)
    }
    startTransition(async () => {
      const result = await updateBarber(null, formData)
      if (result.error) setError(result.error)
      else onCancel()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 rounded-lg border border-kob-border bg-kob-black p-4 space-y-3">
      <input type="hidden" name="id" value={barber.id} />
      <div>
        <label className={LABEL}>Name *</label>
        <input name="name" defaultValue={barber.name} required className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Profile photo</label>
        <PhotoInput
          currentUrl={barber.photo_url}
          onFileSelect={setSelectedPhoto}
          onRemoveToggle={setRemovingPhoto}
        />
      </div>
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle active={active} onChange={setActive} />
          <span className="text-sm text-kob-white">
            {active ? 'Active (visible on public site)' : 'Inactive (hidden on public site)'}
          </span>
        </label>
      </div>
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle active={isOwner} onChange={setIsOwner} />
          <span className="text-sm text-kob-white">
            {isOwner ? 'Owner / Main barber (shown first)' : 'Owner / Main barber'}
          </span>
        </label>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className={BTN_GHOST}>Cancel</button>
      </div>
    </form>
  )
}

function AddForm({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('is_owner', isOwner.toString())
    if (selectedPhoto) formData.set('photo', selectedPhoto, selectedPhoto.name)
    startTransition(async () => {
      const result = await addBarber(null, formData)
      if (result.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-kob-red/40 bg-kob-black p-4 space-y-3 mb-4">
      <p className="text-sm font-medium text-kob-white">New barber</p>
      <div>
        <label className={LABEL}>Name *</label>
        <input name="name" required placeholder="Full name" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Profile photo (optional)</label>
        <PhotoInput
          onFileSelect={setSelectedPhoto}
          onRemoveToggle={() => {}}
        />
      </div>
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle active={isOwner} onChange={setIsOwner} />
          <span className="text-sm text-kob-white">Owner / Main barber (shown first)</span>
        </label>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Adding…' : 'Add barber'}
        </button>
        <button type="button" onClick={onClose} className={BTN_GHOST}>Cancel</button>
      </div>
    </form>
  )
}

export default function BarbersClient({ barbers }: { barbers: Barber[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete(id: string) {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteBarber(id)
      if (result.error) setDeleteError(result.error)
      else setConfirmDeleteId(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-kob-white">Barbers</h1>
        <button onClick={() => { setShowAdd(true); setEditingId(null) }} className={BTN_PRIMARY}>
          + Add barber
        </button>
      </div>

      {showAdd && <AddForm onClose={() => setShowAdd(false)} />}

      {deleteError && (
        <p className="mb-4 text-sm text-red-400 rounded border border-red-800 px-3 py-2 bg-red-900/10">
          {deleteError}
        </p>
      )}

      <div className="rounded-lg border border-kob-border bg-kob-dark overflow-hidden">
        {barbers.length === 0 && (
          <p className="p-6 text-kob-muted text-sm">No barbers yet. Add one above.</p>
        )}
        {barbers.map((barber, i) => (
          <div key={barber.id} className={i > 0 ? 'border-t border-kob-border' : ''}>
            <div className="flex items-center gap-4 px-4 py-3">
              <BarberAvatar url={barber.photo_url} name={barber.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-kob-white truncate">{barber.name}</p>
                <p className="text-xs text-kob-muted">{barber.active ? 'Active' : 'Inactive'}</p>
              </div>
              {confirmDeleteId === barber.id ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-kob-muted text-xs">Delete?</span>
                  <button
                    disabled={isPending}
                    onClick={() => handleDelete(barber.id)}
                    className="rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    {isPending ? '…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} className={BTN_GHOST}>Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(editingId === barber.id ? null : barber.id); setShowAdd(false) }}
                    className={BTN_GHOST}
                  >
                    {editingId === barber.id ? 'Close' : 'Edit'}
                  </button>
                  <button onClick={() => { setConfirmDeleteId(barber.id); setEditingId(null) }} className={BTN_DANGER}>
                    Delete
                  </button>
                </div>
              )}
            </div>
            {editingId === barber.id && (
              <div className="px-4 pb-4">
                <EditForm barber={barber} onCancel={() => setEditingId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
