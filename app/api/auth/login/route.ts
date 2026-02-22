import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // GUNAKAN LOCALHOST:3000 UNTUK BYPASS MASALAH DNS INTERNAL DOCKER
    const vpsRes = await fetch(`http://localhost:3000/api/vps-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sql: 'SELECT id, email, role, password FROM public."Profiles" WHERE email = $1 LIMIT 1',
        params: [email] 
      })
    })

    if (!vpsRes.ok) {
      throw new Error(`Koneksi API VPS-DB Gagal: ${vpsRes.status}`)
    }

    const { data } = await vpsRes.json()
    const user = data?.[0]

    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'rahasia_dicoment_agency')
    const token = await new SignJWT({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(secret)

    const cookieStore = await cookies()
    cookieStore.set('session-token', token, {
      httpOnly: true,
      secure: true, // WAJIB TRUE DI PRODUCTION (HTTPS)
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    })

    return NextResponse.json({ message: 'Login Berhasil', role: user.role })
  } catch (err: any) {
    console.error("❌ Login Error Detail:", err.message)
    return NextResponse.json({ message: `Server Error: ${err.message}` }, { status: 500 })
  }
}