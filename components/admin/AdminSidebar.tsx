'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { logout } from '@/app/admin/actions'

type Role = 'admin' | 'developer'

const NAV_ITEMS = [
  { href: '/admin',              label: 'Dashboard',      icon: '▦' },
  { href: '/admin/appointments', label: 'Appointments',   icon: '📅' },
  { href: '/admin/barbers',      label: 'Barbers',        icon: '✂' },
  { href: '/admin/services',     label: 'Services',       icon: '€' },
  { href: '/admin/opening-hours',label: 'Opening Hours',  icon: '🕐' },
  { href: '/admin/closed-dates',        label: 'Closed Dates',  icon: '🚫' },
  { href: '/admin/breaks',               label: 'Breaks',        icon: '⏸' },
  { href: '/admin/recurring-clients',    label: 'Recurring',     icon: '🔁' },
  { href: '/admin/cancellation-fees',   label: 'Late Cancels',  icon: '💶' },
  { href: '/admin/settings',            label: 'Settings',      icon: '⚙️' },
  { href: '/admin/integrations',        label: 'Integrations',  icon: '⚙' },
] as const


export default function AdminSidebar({
  role,
  email,
}: {
  role: Role
  email: string
}) {
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(() => {
      logout()
    })
  }

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-kob-border bg-kob-dark min-h-screen">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-kob-border">
        <p className="font-display text-base font-bold tracking-widest uppercase text-kob-white">
          KOB <span className="text-kob-red">Admin</span>
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active =
            href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-kob-surface text-kob-white'
                  : 'text-kob-muted hover:bg-kob-surface hover:text-kob-white'
              }`}
            >
              <span className="w-4 text-center text-xs" aria-hidden>{icon}</span>
              {label}
            </Link>
          )
        })}

      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-kob-border flex flex-col gap-2">
        <p className="text-xs text-kob-muted truncate">{email}</p>
        <span className="inline-block self-start rounded-full border border-kob-border px-2 py-0.5 text-xs uppercase tracking-widest text-kob-muted">
          {role}
        </span>
        <button
          onClick={handleLogout}
          disabled={pending}
          className="mt-1 text-left text-xs text-kob-muted hover:text-kob-white transition-colors disabled:opacity-50"
        >
          {pending ? 'Signing out…' : 'Sign out →'}
        </button>
      </div>
    </aside>
  )
}
