import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. BYPASS TOTAL UNTUK FOLDER UPLOADS
  if (path.startsWith('/uploads')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session-token')?.value
  const isAuthPage = path === '/login'
  const isAdminPage = path.startsWith('/admin')

  // 2. Proteksi Halaman Admin
  if (isAdminPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Jika sudah login jangan ke /login lagi
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // 4. Proteksi Role (Laporan & Tim) menggunakan JWT
  if (token && isAdminPage) {
    const jwtSecret = process.env.JWT_SECRET

    // Tanpa fallback: kalau env belum diset, berhenti dengan pesan jelas
    if (!jwtSecret) {
      console.error('JWT_SECRET belum diset di environment')
      return new NextResponse('Konfigurasi server belum lengkap', { status: 500 })
    }

    try {
      const secret = new TextEncoder().encode(jwtSecret)
      const { payload } = await jwtVerify(token, secret)
      const userRole = (payload.role as string)?.toUpperCase()

      const restrictedPaths = ['/admin/tim', '/admin/pos/laporan-penjualan', '/admin/laporan']
      const isRestricted = restrictedPaths.some(p => path.startsWith(p))

      if (isRestricted && userRole !== 'OWNER' && userRole !== 'SUPERADMIN' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
      }
    } catch (err) {
      // Token expired atau invalid, paksa login ulang
      const res = NextResponse.redirect(new URL('/login', request.url))
      res.cookies.delete('session-token')
      return res
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
}