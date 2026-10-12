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

// Pencatat retur SELALU dari token (bukan localStorage / body)
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
 * POST /api/admin/retur   body: { id: "uuid transaksi", reason: "alasan" }
 * Satu transaksi database: kembalikan stok, catat StockLog, ubah status RETURNED.
 * Gagal di tengah jalan = semuanya dibatalkan (ROLLBACK).
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

  const id = typeof body?.id === 'string' ? body.id : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID transaksi tidak valid' }, { status: 400 })
  }
  if (!reason || reason.length > 500) {
    return NextResponse.json({ error: 'Alasan retur wajib diisi (maks 500 karakter)' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const txRes = await client.query(
      `SELECT id, status, items FROM public."Transactions" WHERE id = $1::uuid FOR UPDATE`,
      [id]
    )
    const tx = txRes.rows[0]
    if (!tx) throw new ApiError(404, 'Transaksi tidak ditemukan')
    if (tx.status === 'RETURNED') throw new ApiError(400, 'Transaksi ini sudah diretur')

    let items: any = tx.items
    if (typeof items === 'string') {
      try { items = JSON.parse(items) } catch { items = [] }
    }
    if (!Array.isArray(items)) items = []

    for (const item of items) {
      const qty = Number(item?.quantity)
      if (!item?.stockId || !Number.isFinite(qty) || qty <= 0) {
        throw new ApiError(400, `Data item tidak valid: ${item?.name ?? '-'}`)
      }

      const stockRes = await client.query(
        `SELECT stock FROM public."ProductSizeStock" WHERE id = $1::uuid FOR UPDATE`,
        [item.stockId]
      )
      if (!stockRes.rows[0]) {
        throw new ApiError(400, `Data stok untuk ${item.name ?? '-'} sudah tidak ada, retur dibatalkan`)
      }
      const oldStock = Number(stockRes.rows[0].stock)

      await client.query(
        `UPDATE public."ProductSizeStock" SET stock = stock + $1 WHERE id = $2::uuid`,
        [qty, item.stockId]
      )

      await client.query(
        `INSERT INTO public."StockLog"
           (product_name, size_value, old_stock, new_stock, type, notes, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'RETUR', $5, $6, NOW())`,
        [item.name, String(item.size ?? ''), oldStock, oldStock + qty, `Retur Seller: ${reason}`, userId]
      )
    }

    await client.query(
      `UPDATE public."Transactions" SET status = 'RETURNED', return_reason = $2 WHERE id = $1::uuid`,
      [id, reason]
    )

    await client.query('COMMIT')
    return NextResponse.json({ ok: true, error: null })
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {})
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('❌ Retur error:', err.message)
    return NextResponse.json({ error: err.message || 'Gagal memproses retur' }, { status: 500 })
  } finally {
    client.release()
  }
}