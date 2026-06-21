'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '../actions'

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-semibold uppercase tracking-widest text-kob-muted"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border border-kob-border bg-kob-black px-4 py-3 text-sm text-kob-white placeholder:text-kob-border focus:border-kob-red focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-widest text-kob-muted"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border border-kob-border bg-kob-black px-4 py-3 text-sm text-kob-white placeholder:text-kob-border focus:border-kob-red focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 bg-kob-red px-6 py-3 text-sm font-semibold uppercase tracking-widest text-kob-white transition-colors hover:bg-kob-red-dark disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
