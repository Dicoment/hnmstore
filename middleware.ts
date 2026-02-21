import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose' // Lebih ringan buat Middleware: npm install jose

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. BYPASS TOTAL UNTUK UPLOADS (Biar gambar gak pecah lagi)
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

  // 4. Proteksi Role (Laporan & Tim)
  if (token && isAdminPage) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'rahasia_dicoment_agency')
      const { payload } = await jwtVerify(token, secret)
      const userRole = (payload.role as string)?.toUpperCase()

      const restrictedPaths = ['/admin/tim', '/admin/pos/laporan-penjualan', '/admin/laporan']
      const isRestricted = restrictedPaths.some(p => path.startsWith(p))

      if (isRestricted && userRole !== 'OWNER' && userRole !== 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
      }
    } catch (err) {
      // Token expired atau invalid
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