import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const path = request.nextUrl.pathname
  const isAuthPage = path === '/login'
  const isAdminPage = path.startsWith('/admin')
  // Pastikan halaman unauthorized tidak ikut dicek role-nya biar tidak looping redirect
  const isUnauthorizedPage = path === '/admin/unauthorized'

  // 1. PROTEKSI BELUM LOGIN
  if (isAdminPage && !session && !isUnauthorizedPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. PROTEKSI SUDAH LOGIN
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // 3. PROTEKSI ROLE (OWNER VS KARYAWAN)
  if (session && isAdminPage && !isUnauthorizedPage) {
    const ownerOnlyPaths = [
      '/admin/tim',
      '/admin/pos/laporan-penjualan',
      '/admin/laporan'
    ]

    const isAccessingRestricted = ownerOnlyPaths.some(p => path.startsWith(p))

    if (isAccessingRestricted) {
      const { data: profile } = await supabase
        .from('Profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      // Jika role-nya KARYAWAN atau tidak punya data profil, lempar ke halaman keren yang kita buat tadi
      if (!profile || profile.role === 'KARYAWAN') {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}