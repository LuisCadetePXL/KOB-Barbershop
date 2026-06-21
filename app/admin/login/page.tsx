import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Admin Login — King of Barber' }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-kob-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-bold tracking-widest uppercase text-kob-white">
            KOB <span className="text-kob-red">Admin</span>
          </p>
          <p className="mt-1 text-xs text-kob-muted uppercase tracking-widest">
            King of Barber — Staff Portal
          </p>
        </div>

        {/* Form */}
        <div className="border border-kob-border bg-kob-dark p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-kob-border">
          This area is for authorised staff only.
        </p>
      </div>
    </div>
  )
}
