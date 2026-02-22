import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'
import { Pool } from 'pg' // Import Pool langsung di sini

// Inisialisasi Pool langsung di dalam API Login
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false 
})

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // 1. Ambil data user LANGSUNG dari database
    const result = await pool.query(
      'SELECT id, email, role, password, full_name FROM public."Profiles" WHERE email = $1 LIMIT 1',
      [email]
    )
    
    const user = result.rows[0]

    // 2. Validasi
    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 })
    }

    // 3. Buat Token JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'rahasia_dicoment_agency')
    const token = await new SignJWT({ 
        id: user.id, 
        email: user.email, 
        role: user.role.toUpperCase() 
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(secret)

    // 4. Set Cookie & Response
    const cookieStore = await cookies()
    cookieStore.set('session-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    })

    return NextResponse.json({ 
      success: true, 
      role: user.role,
      fullName: user.full_name // Kirim nama buat disimpan di client
    })

  } catch (err: any) {
    console.error("❌ Login Crash:", err.message)
    return NextResponse.json({ message: `Server Error: ${err.message}` }, { status: 500 })
  }
}