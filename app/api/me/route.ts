import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { jwtVerify } from 'jose'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: false
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session-token')?.value
  const jwtSecret = process.env.JWT_SECRET
  if (!token || !jwtSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret))
    const p = payload as Record<string, any>

    // Cari ID profil dari beberapa kemungkinan nama field di token
    let id: string | null = p.id ?? p.sub ?? p.userId ?? p.user_id ?? null
    let name: string | null = p.full_name ?? p.name ?? null
    const role: string | null = p.role ?? null

    // Cadangan: kalau token cuma menyimpan email, cari ID-nya di tabel Profiles
    if (!id && p.email) {
      const r = await pool.query(
        `SELECT id, full_name FROM public."Profiles" WHERE email = $1 LIMIT 1`,
        [p.email]
      )
      id = r.rows[0]?.id ?? null
      name = name ?? r.rows[0]?.full_name ?? null
    }

    return NextResponse.json({
      id,
      name,
      role,
      tokenKeys: Object.keys(p) // untuk pengecekan, boleh dihapus nanti
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}