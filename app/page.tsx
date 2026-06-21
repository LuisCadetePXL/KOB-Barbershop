import { redirect } from 'next/navigation'

// Middleware handles / → /nl, but this is a safety net
export default function Root() {
  redirect('/nl')
}
