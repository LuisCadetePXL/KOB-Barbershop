import { createServerClient } from '@supabase/ssr'
import createNextIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const nextIntlMiddleware = createNextIntlMiddleware(routing)

async function handleAdmin(request: NextRequest): Promise<NextResponse> {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  if (!user) {
    if (isLoginPage) return response
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Logged in — verify the account is actually staff (admin/developer).
  // A valid Supabase session is not enough: without this check any registered
  // user would pass the gate. RLS still protects RLS-based queries, but the
  // service-role server actions rely on this + their own requireStaff() guard.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isStaff = !!profile && ['admin', 'developer'].includes(profile.role)

  if (!isStaff) {
    // Non-staff: let them see the login page (so they can sign in as staff),
    // but block every other /admin path. Returning `response` on the login page
    // avoids a redirect loop with the isLoginPage → /admin redirect below.
    if (isLoginPage) return response
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return handleAdmin(request)
  }
  return nextIntlMiddleware(request)
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!api|_next/static|_next/image|images|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
}
