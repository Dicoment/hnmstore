import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { jwtVerify } from 'jose'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false
})

export async function POST(req: NextRequest) {
  // Wajib login: cek JWT dari cookie
  const token = req.cookies.get('session-token')?.value
  const jwtSecret = process.env.JWT_SECRET
  if (!token || !jwtSecret) {
    return NextResponse.json({ data: [], error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(jwtSecret))
  } catch {
    return NextResponse.json({ data: [], error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sql, params } = await req.json()

    if (!sql) {
      return NextResponse.json({ error: 'Query SQL kosong!' }, { status: 400 })
    }

    const result = await pool.query(sql, params || [])

    return NextResponse.json({
      data: result.rows,
      rowCount: result.rowCount,
      error: null
    })
  } catch (err: any) {
    console.error('❌ VPS DB Error:', err.message)
    return NextResponse.json({
      data: [],
      error: err.message
    }, { status: 500 })
  }
}