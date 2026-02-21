// middleware.ts (VERSI TANPA SUPABASE)
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. HARD BYPASS UNTUK FOLDER UPLOADS (Biar gak pecah lagi)
  if (path.startsWith('/uploads')) {
    return NextResponse.next()
  }

  // 2. Ambil Session/Cookie Login (Sesuaikan dengan sistem login kamu sekarang)
  const sessionToken = request.cookies.get('session-token')?.value 

  const isAuthPage = path === '/login'
  const isAdminPage = path.startsWith('/admin')

  // Jika ke area admin tapi gak ada session, lempar ke login
  if (isAdminPage && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Jika sudah login tapi mau ke /login, lempar ke /admin
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // 3. LOGIKA PROTEKSI ROLE (Tembak API VPS-DB)
  if (sessionToken && isAdminPage && path !== '/admin/unauthorized') {
    const restrictedPaths = ['/admin/tim', '/admin/pos/laporan-penjualan', '/admin/laporan']
    const isRestricted = restrictedPaths.some(p => path.startsWith(p))

    if (isRestricted) {
      try {
        // Tembak API VPS Lokal kamu
        const vpsRes = await fetch(`${request.nextUrl.origin}/api/vps-db`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             // Pastikan query ini sesuai dengan struktur tabel user kamu sekarang
             token: sessionToken 
          })
        })
        
        const result = await vpsRes.json()
        const userRole = result.data?.role?.toUpperCase()

        if (userRole !== 'SUPERADMIN' && userRole !== 'OWNER') {
          return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
        }
      } catch (err) {
        return NextResponse.next() // Atau handle error sesuai keinginan
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
}
