import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { jwtVerify } from 'jose'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Identitas penerima pembayaran SELALU dari token, bukan dari body request
async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('session-token')?.value
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    const id = typeof payload.id === 'string' ? payload.id : null
    return id && UUID_RE.test(id) ? id : null
  } catch {
    return null
  }
}

/**
 * POST /api/admin/hutang/bayar
 *  - Lunasi sisa  : { ids: ["uuid", ...] }            (boleh banyak nota)
 *  - Cicil sebagian: { ids: ["uuid"], amount: 150000 } (hanya 1 nota)
 * Semua dalam satu transaksi database + row lock (FOR UPDATE).
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
  if (ids.length === 0 || ids.length > 200 || !ids.every((i) => typeof i === 'string' && UUID_RE.test(i))) {
    return NextResponse.json({ error: 'ID transaksi tidak valid' }, { status: 400 })
  }

  const hasAmount = body.amount !== undefined && body.amount !== null
  const amount = hasAmount ? Number(body.amount) : null
  if (hasAmount) {
    if (ids.length !== 1) {
      return NextResponse.json({ error: 'Cicilan hanya untuk satu nota' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || (amount as number) <= 0) {
      return NextResponse.json({ error: 'Nominal harus lebih dari 0' }, { status: 400 })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT id, total, COALESCE(amount_paid, 0) AS amount_paid, payment_status, status
       FROM public."Transactions"
       WHERE id = ANY($1::uuid[])
       FOR UPDATE`,
      [ids]
    )

    let updated = 0
    let skipped = ids.length - rows.length

    for (const r of rows) {
      if (r.payment_status !== 'HUTANG' || r.status !== 'SUCCESS') {
        skipped++
        continue
      }

      const total = Number(r.total)
      const paid = Number(r.amount_paid)
      const sisa = Math.max(total - paid, 0)
      const pay = amount ?? sisa

      if (pay > sisa + 0.001) {
        throw new ApiError(400, 'Nominal melebihi sisa hutang')
      }

      const newPaid = paid + pay
      const lunas = newPaid >= total - 0.001

      await client.query(
        `UPDATE public."Transactions"
         SET amount_paid = $1, payment_status = $2, paid_by = $3, paid_at = NOW()
         WHERE id = $4`,
        [lunas ? total : newPaid, lunas ? 'LUNAS' : 'HUTANG', userId, r.id]
      )
      updated++
    }

    if (updated === 0) {
      throw new ApiError(400, 'Tidak ada nota yang bisa dibayar (sudah lunas, diretur, atau tidak ditemukan)')
    }

    await client.query('COMMIT')
    return NextResponse.json({ ok: true, updated, skipped, error: null })
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {})
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('❌ Bayar hutang error:', err.message)
    return NextResponse.json({ error: err.message || 'Gagal memproses pembayaran' }, { status: 500 })
  } finally {
    client.release()
  }
}