import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { getLocale } from 'next-intl/server'
import './globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kobbarbershop.be'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'King of Barber — Leopoldsburg',
  description:
    'Premium barbershop in Leopoldsburg. Book your appointment online for haircuts, fades, beard trims and more.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Reflect the active locale on <html lang> so screen readers and search
  // engines get the correct language. Falls back to the default locale for
  // non-localized routes (e.g. /admin).
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${playfair.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
