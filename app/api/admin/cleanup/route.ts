import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { jwtVerify } from 'jose'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: false
})

// Data yang lebih baru dari ini tidak boleh dihapus
const MIN_RETENTION_DAYS = 30

export async function POST(req: NextRequest) {
  try {
    // 1. Wajib login
    const token = req.cookies.get('session-token')?.value
    const jwtSecret = process.env.JWT_SECRET
    if (!token || !jwtSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: Record<string, any>
    try {
      const verified = await jwtVerify(token, new TextEncoder().encode(jwtSecret))
      payload = verified.payload as Record<string, any>
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Wajib OWNER (dicek di token DAN di database)
    const tokenRole = String(payload.role ?? '').toUpperCase()
    const adminId = payload.id
    if (tokenRole !== 'OWNER' || !adminId) {
      return NextResponse.json({ error: 'Hanya OWNER yang boleh menghapus data.' }, { status: 403 })
    }
    const roleRes = await pool.query(
      `SELECT role FROM public."Profiles" WHERE id = $1 LIMIT 1`,
      [adminId]
    )
    const dbRole = String(roleRes.rows[0]?.role ?? '').toUpperCase()
    if (dbRole !== 'OWNER') {
      return NextResponse.json({ error: 'Hanya OWNER yang boleh menghapus data.' }, { status: 403 })
    }

    // 3. Validasi input
    const { target, before, dryRun } = await req.json()

    if (target !== 'stocklog' && target !== 'transactions') {
      return NextResponse.json({ error: 'Target tidak valid.' }, { status: 400 })
    }
    if (typeof before !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
      return NextResponse.json({ error: 'Format tanggal tidak valid.' }, { status: 400 })
    }
    const cutoff = new Date(`${before}T00:00:00+07:00`)
    if (isNaN(cutoff.getTime())) {
      return NextResponse.json({ error: 'Tanggal tidak valid.' }, { status: 400 })
    }
    const limit = Date.now() - MIN_RETENTION_DAYS * 24 * 60 * 60 * 1000
    if (cutoff.getTime() > limit) {
      return NextResponse.json(
        { error: `Hanya data yang lebih lama dari ${MIN_RETENTION_DAYS} hari yang boleh dihapus.` },
        { status: 400 }
      )
    }

    // 4. Susun query (semua dihitung dalam zona waktu WIB)
    const table = target === 'stocklog' ? 'public."StockLog"' : 'public."Transactions"'
    const where =
      target === 'stocklog'
        ? `created_at < (($1::date)::timestamp AT TIME ZONE 'Asia/Jakarta')`
        : `created_at < (($1::date)::timestamp AT TIME ZONE 'Asia/Jakarta')
           AND COALESCE(payment_status, 'LUNAS') <> 'HUTANG'`

    // 5. Pratinjau: hanya hitung
    if (dryRun) {
      const r = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`, [before])
      return NextResponse.json({ ok: true, dryRun: true, count: r.rows[0].n })
    }

    // 6. Hapus
    const del = await pool.query(`DELETE FROM ${table} WHERE ${where}`, [before])
    const count = del.rowCount ?? 0
    console.log(`[CLEANUP] owner=${adminId} target=${target} sebelum=${before} terhapus=${count}`)

    return NextResponse.json({ ok: true, dryRun: false, count })
  } catch (err: any) {
    console.error('❌ Cleanup error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}