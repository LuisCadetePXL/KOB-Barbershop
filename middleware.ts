import { createServerClient } from '@supabase/ssr'
import createNextIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const nextIntlMiddleware = createNextIntlMiddleware(routing)

async function handleAdmin(request: NextRequest): Promise<NextResponse> {
  // Build a response we can attach refreshed cookies to
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() validates the JWT server-side — more secure than getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage =
    request.nextUrl.pathname === '/admin/login'

  if (!user) {
    // Not authenticated: allow the login page, redirect everything else
    if (isLoginPage) return response
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Authenticated: redirect away from login page
  if (isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return handleAdmin(request)
  }
  return nextIntlMiddleware(request)
}

export const config = {
  matcher: [
    // Admin routes → auth middleware
    '/admin/:path*',
    // Public routes → next-intl (exclude static assets and api)
    '/((?!api|_next/static|_next/image|favicon\\.ico).*)']
}
