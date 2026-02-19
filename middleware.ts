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

  // 1. Pakai getUser() untuk validasi keamanan terbaru
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthPage = path === '/login'
  const isAdminPage = path.startsWith('/admin')
  const isUnauthorizedPage = path === '/admin/unauthorized'

  if (isAdminPage && !user && !isUnauthorizedPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // 2. PROTEKSI ROLE DENGAN BYPASS CACHE
  if (user && isAdminPage && !isUnauthorizedPage) {
    const ownerOnlyPaths = ['/admin/tim', '/admin/pos/laporan-penjualan', '/admin/laporan']
    const isAccessingRestricted = ownerOnlyPaths.some(p => path.startsWith(p))

    if (isAccessingRestricted) {
      // Kita tambahkan abortSignal atau query unik agar tidak kena cache Next.js
      const { data: profile } = await supabase
        .from('Profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role?.toString().trim().toUpperCase()
      
      // LOGGING UNTUK DEBUGGING (Cek di terminal VS Code lu pas lu klik menu)
      console.log(`DEBUG: User ${user.email} Role Terdeteksi: [${userRole}]`)

      // IZINKAN JIKA SUPERADMIN ATAU OWNER
      if (userRole !== 'SUPERADMIN' && userRole !== 'OWNER') {
        console.log("RESULT: REDIRECT TO UNAUTHORIZED")
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}