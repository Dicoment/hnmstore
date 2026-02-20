import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 1. Inisialisasi Client Supabase (Hanya untuk Cek Sesi Auth)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 2. Ambil User yang Sedang Login
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthPage = path === '/login'
  const isAdminPage = path.startsWith('/admin')

  // --- LOGIKA PROTEKSI HALAMAN ---

  // Belum login tapi maksa masuk area admin? Lempar ke login
  if (isAdminPage && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Sudah login tapi mau buka halaman login lagi? Lempar ke dashboard
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // 3. CEK ROLE DARI DATABASE VPS (Bukan Supabase)
  if (user && isAdminPage && path !== '/admin/unauthorized') {
    const restrictedPaths = ['/admin/tim', '/admin/pos/laporan-penjualan', '/admin/laporan']
    const isRestricted = restrictedPaths.some(p => path.startsWith(p))

    if (isRestricted) {
      try {
        // Tembak API VPS Lokal
        const vpsRes = await fetch(`${request.nextUrl.origin}/api/vps-db`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sql: 'SELECT role FROM public."Profiles" WHERE id = $1 LIMIT 1',
            params: [user.id] 
          })
        })
        
        const result = await vpsRes.json()
        const userRole = result.data?.[0]?.role?.toUpperCase()

        // Validasi: Hanya OWNER atau SUPERADMIN yang boleh masuk
        if (userRole !== 'SUPERADMIN' && userRole !== 'OWNER') {
          return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
        }
      } catch (err) {
        // Jika koneksi VPS bermasalah, demi keamanan lempar ke login
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}