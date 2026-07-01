'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import LanguageSwitcher from './LanguageSwitcher'

export default function Header() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navLinks = [
    { href: '/' as const,        label: t('home') },
    { href: '/about' as const,   label: t('about') },
    { href: '/team' as const,    label: t('team') },
    { href: '/prices' as const,  label: t('prices') },
    { href: '/contact' as const, label: t('contact') },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-kob-border bg-kob-black/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link
          href="/"
          className="flex flex-col leading-tight"
          onClick={() => setOpen(false)}
        >
          <span className="font-display text-lg font-bold tracking-widest text-kob-white uppercase">
            KOB <span className="text-kob-red">Belgium</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-kob-muted">
            King of Barber
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium tracking-wide uppercase transition-colors ${
                pathname === href
                  ? 'text-kob-red'
                  : 'text-kob-muted hover:text-kob-white'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="ml-2 h-4 w-px bg-kob-border" />
          <LanguageSwitcher />
          <Link
            href="/book"
            className="ml-1 rounded-none border border-kob-red px-4 py-2 text-sm font-medium uppercase tracking-widest text-kob-red transition-colors hover:bg-kob-red hover:text-kob-white"
          >
            {t('bookNow')}
          </Link>
        </nav>

        {/* Mobile: language switcher + hamburger */}
        <div className="flex md:hidden items-center gap-4">
          <LanguageSwitcher />
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex flex-col gap-1.5 p-2"
            onClick={() => setOpen(!open)}
          >
            <span className={`block h-0.5 w-6 bg-kob-white transition-transform duration-200 ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-6 bg-kob-white transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 bg-kob-white transition-transform duration-200 ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <nav className="md:hidden border-t border-kob-border bg-kob-dark px-4 py-6 flex flex-col gap-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`text-base font-medium uppercase tracking-wide ${
                pathname === href ? 'text-kob-red' : 'text-kob-muted'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/book"
            onClick={() => setOpen(false)}
            className="mt-2 block border border-kob-red px-5 py-3 text-center text-sm font-medium uppercase tracking-widest text-kob-red"
          >
            {t('bookNow')}
          </Link>
        </nav>
      )}
    </header>
  )
}
