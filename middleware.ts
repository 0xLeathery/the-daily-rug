import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { decodeJwt } from 'jose'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Middleware cannot use cookies() from next/headers (Edge Runtime).
  // Instead, we create the Supabase client inline using request.cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() for auth validation — it reads cookies without re-validating.
  // Always use getUser() which validates the token server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect /admin routes (excluding /admin/login to avoid redirect loops)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user) {
      // Unauthenticated: redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    // Authenticated: check JWT role claim.
    // getSession() is used here ONLY to read JWT claims — getUser() above already validated the token.
    // Phase 1's custom_access_token_hook bakes user_role as a TOP-LEVEL claim (not app_metadata.user_role).
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      const claims = decodeJwt(session.access_token)
      const role = claims.user_role as string | undefined

      if (role !== 'admin') {
        // Non-admin authenticated user: rewrite to /not-found.
        // Using rewrite (not redirect) keeps the URL unchanged — user doesn't learn about admin routes.
        return NextResponse.rewrite(new URL('/not-found', request.url))
      }
    } else {
      // No session despite user existing — edge case, send to login
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // Return supabaseResponse so refreshed auth cookies are forwarded to the browser.
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
