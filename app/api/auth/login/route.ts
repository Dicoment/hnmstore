import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sign } from 'jsonwebtoken' // Install dulu: npm install jsonwebtoken & npm install @types/jsonwebtoken -D

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // 1. Tembak Database VPS kamu (Gunakan Prisma atau SQL murni)
    // Misal kita pakai API internal vps-db yang sudah kamu punya
    const vpsRes = await fetch(`${new URL(request.url).origin}/api/vps-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sql: 'SELECT id, email, role, password FROM public."Profiles" WHERE email = $1 LIMIT 1',
        params: [email] 
      })
    })

    const { data } = await vpsRes.json()
    const user = data?.[0]

    // 2. Validasi (Sederhana, sebaiknya pakai bcrypt untuk password)
    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 })
    }

    // 3. Buat Token JWT
    const token = sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'rahasia_dicoment_agency',
      { expiresIn: '1d' }
    )

    // 4. Set Cookie
    const cookieStore = await cookies()
    cookieStore.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 Hari
    })

    return NextResponse.json({ message: 'Login Berhasil', role: user.role })
  } catch (err) {
    return NextResponse.json({ message: 'Server Error' }, { status: 500 })
  }
}