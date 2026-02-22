import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose' // PAKAI INI, JANGAN JSONWEBTOKEN

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // 1. Tembak Database VPS lu lewat API vps-db yang sudah stabil
    const baseUrl = new URL(request.url).origin
    const vpsRes = await fetch(`${baseUrl}/api/vps-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sql: 'SELECT id, email, role, password FROM public."Profiles" WHERE email = $1 LIMIT 1',
        params: [email] 
      })
    })

    const { data } = await vpsRes.json()
    const user = data?.[0]

    // 2. Validasi (Sesuai password plain text di Adminer lu)
    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 })
    }

    // 3. Buat Token JWT pakai JOSE (Kunci Gerbang yang support Middleware)
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

    // 4. Set Cookie HttpOnly (Aman dari pencurian script)
    const cookieStore = await cookies()
    cookieStore.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    })

    return NextResponse.json({ message: 'Login Berhasil', role: user.role })
  } catch (err) {
    console.error("Login Error:", err)
    return NextResponse.json({ message: 'Server Error' }, { status: 500 })
  }
}