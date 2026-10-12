'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, Eye, Check, RotateCcw, CheckSquare, Square, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import TableCustom from './table'
import Pagination from '@/components/shop/Pagination'

export type PiutangTab = 'BELUM_LUNAS' | 'JATUH_TEMPO' | 'RIWAYAT'

export interface PiutangSummary {
  sisa: number        // total sisa tagihan sesuai filter
  pairs: number       // jumlah pasang (items_count)
  notas: number       // jumlah nota
  globalSisa: number  // total semua hutang belum lunas (tanpa filter)
}

interface ContentPiutangProps {
  type: PiutangTab
  search: string
  empId: string
  from: string
  to: string
  refreshKey: number
  onDataUpdate: (data: any[]) => void
  onSummary: (s: PiutangSummary) => void
  onActionDetail: (tx: any) => void
  onActionRetur: (tx: any) => void
  onActionBayar: (tx: any) => void
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}

const LIMIT = 10

const TAB_WHERE: Record<PiutangTab, string> = {
  BELUM_LUNAS: `t.payment_status = 'HUTANG' AND t.status = 'SUCCESS'`,
  JATUH_TEMPO: `t.payment_status = 'HUTANG' AND t.status = 'SUCCESS' AND t.due_date < (NOW() AT TIME ZONE 'Asia/Jakarta')::date`,
  RIWAYAT: `t.payment_method = 'HUTANG' AND (t.payment_status = 'LUNAS' OR t.status = 'RETURNED')`
}

// Nota yang masih bisa dibayar / diselesaikan
export const isPayable = (tx: any) => tx.payment_status === 'HUTANG' && tx.status === 'SUCCESS'

// Helper: lempar error kalau gagal (tidak diam-diam diabaikan)
async function runSql(sql: string, params: any[] = []) {
  const res = await fetch('/api/vps-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
  })
  let result: any = null
  try { result = await res.json() } catch { /* body bukan JSON */ }
  if (!res.ok || !result || result.error) {
    throw new Error(result?.error || `HTTP ${res.status}`)
  }
  return result.data || []
}

export default function ContentPiutang({
  type, search, empId, from, to, refreshKey,
  onDataUpdate, onSummary, onActionDetail, onActionRetur, onActionBayar,
  selectedIds, onToggleSelect
}: ContentPiutangProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const reqId = useRef(0)

  const sendWhatsApp = (customer: string, sisa: number, dueDate: string, whatsapp: string) => {
    const tgl = dueDate ? new Date(dueDate).toLocaleDateString('id-ID') : 'segera'
    const targetPhone = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : ''
    if (!targetPhone) return alert('Nomor WA tidak ditemukan!')
    const msg = `Halo kak ${customer}, admin HnM Store mengingatkan tagihan Rp ${Number(sisa).toLocaleString()} jatuh tempo ${tgl}. Mohon segera dilunasi ya kak. Trims!`
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const fetchPiutang = useCallback(async () => {
    const myReq = ++reqId.current
    try {
      setLoading(true)
      setError('')

      const where = `
        ${TAB_WHERE[type]}
        AND (t.customer ILIKE $1 OR t.id::text ILIKE $1)
        AND ($2::uuid IS NULL OR t.created_by = $2::uuid)
        AND ($3::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $3::date)
        AND ($4::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $4::date)
      `
      const params = [`%${search}%`, empId || null, from || null, to || null]
      const offset = (page - 1) * LIMIT

      const listSql = `
        SELECT t.*,
          p.full_name  AS admin_name,
          pb.full_name AS paid_by_name,
          (
            SELECT (value->>'image')::text
            FROM jsonb_array_elements(t.items::jsonb)
            LIMIT 1
          ) AS featured_image,
          COUNT(*) OVER() AS full_count
        FROM public."Transactions" t
        LEFT JOIN public."Profiles" p  ON p.id  = t.created_by
        LEFT JOIN public."Profiles" pb ON pb.id = t.paid_by
        WHERE ${where}
        ORDER BY t.created_at DESC
        LIMIT ${LIMIT} OFFSET ${offset}
      `

      // Ringkasan dihitung di database, bukan dari baris yang tampil
      const sumSql = `
        SELECT
          COALESCE(SUM(t.total - COALESCE(t.amount_paid, 0)), 0) AS sisa,
          COALESCE(SUM(t.items_count), 0) AS pairs,
          COUNT(*) AS notas
        FROM public."Transactions" t
        WHERE ${where}
      `

      const globalSql = `
        SELECT COALESCE(SUM(total - COALESCE(amount_paid, 0)), 0) AS sisa
        FROM public."Transactions"
        WHERE payment_status = 'HUTANG' AND status = 'SUCCESS'
      `

      const [rows, sumRows, globalRows] = await Promise.all([
        runSql(listSql, params),
        runSql(sumSql, params),
        runSql(globalSql)
      ])

      if (myReq !== reqId.current) return // ada request lebih baru, abaikan

      // Halaman terakhir jadi kosong (mis. nota terakhir baru dilunasi): mundur satu halaman
      if (rows.length === 0 && page > 1) {
        setPage(page - 1)
        return
      }

      setData(rows)
      setTotalData(Number(rows[0]?.full_count || 0))
      onDataUpdate(rows)
      onSummary({
        sisa: Number(sumRows[0]?.sisa || 0),
        pairs: Number(sumRows[0]?.pairs || 0),
        notas: Number(sumRows[0]?.notas || 0),
        globalSisa: Number(globalRows[0]?.sisa || 0)
      })
    } catch (err: any) {
      if (myReq !== reqId.current) return
      console.error(err)
      setError(err.message || 'Gagal memuat data')
    } finally {
      if (myReq === reqId.current) setLoading(false)
    }
  }, [type, search, empId, from, to, page, refreshKey, onDataUpdate, onSummary])

  useEffect(() => { fetchPiutang() }, [fetchPiutang])

  // Ganti filter -> kembali ke halaman 1
  useEffect(() => { setPage(1) }, [search, type, empId, from, to])

  const totalPages = Math.ceil(totalData / LIMIT)

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-bold uppercase">
          {error}
        </div>
      )}

      {/* TABLE DESKTOP */}
      <div className="hidden lg:block border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white font-bold">
        <TableCustom headers={['Sel', 'Foto', 'Seller', 'Kasir', 'Total', 'Tgl', 'Tempo', 'Aksi']} loading={loading}>
          {data.length === 0 && (
            <tr>
              <td colSpan={8} className="p-16 text-center text-[10px] font-bold uppercase tracking-widest text-gray-300">
                Tidak ada data
              </td>
            </tr>
          )}
          {data.map((tx) => {
            const isSelected = selectedIds.includes(tx.id)
            const payable = isPayable(tx)
            const paid = Number(tx.amount_paid || 0)
            const sisa = Math.max(Number(tx.total || 0) - paid, 0)
            return (
              <tr key={tx.id} className={`hover:bg-gray-50 border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                <td className="p-4">
                  {payable && (
                    <button onClick={() => onToggleSelect(tx.id)} className={`${isSelected ? 'text-black' : 'text-gray-300'}`}>
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  )}
                </td>
                <td className="p-4">
                  <div className="w-14 h-14 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                    {tx.featured_image ? (
                      <Image src={`/uploads/${tx.featured_image}`} alt="produk" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={20} /></div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-xs font-bold uppercase text-black leading-none mb-1">{tx.customer}</p>
                  <p className="text-[10px] text-gray-400 font-bold tracking-tight">INV-{tx.id.toString().slice(0, 8)}</p>
                </td>
                <td className="p-4">
                  <p className="text-xs font-bold uppercase text-black leading-none">{tx.admin_name || '-'}</p>
                  {tx.paid_by_name && (
                    <p className="text-[10px] text-gray-400 font-bold tracking-tight mt-1">TERIMA: {tx.paid_by_name}</p>
                  )}
                </td>
                <td className="p-4 font-bold text-xs">
                  <p className={tx.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-red-600'}>RP {Number(tx.total).toLocaleString()}</p>
                  {payable && paid > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1">DIBAYAR RP {paid.toLocaleString()} · SISA RP {sisa.toLocaleString()}</p>
                  )}
                </td>
                <td className="p-4 text-xs font-bold uppercase">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                <td className={`p-4 text-xs font-bold uppercase ${new Date(tx.due_date) < new Date() && tx.payment_status === 'HUTANG' ? 'text-red-600' : 'text-black'}`}>
                  {tx.due_date ? new Date(tx.due_date).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    {payable && (
                      <><button onClick={() => onActionBayar(tx)} className="p-3 bg-black text-white rounded-lg shadow-sm active:scale-95 transition-all"><Check size={16} /></button>
                        <button onClick={() => onActionRetur(tx)} className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 active:scale-95 transition-all"><RotateCcw size={16} /></button>
                        <button onClick={() => sendWhatsApp(tx.customer, sisa, tx.due_date, tx.whatsapp)} className="p-3 bg-green-50 text-green-600 rounded-lg border border-green-100 active:scale-95 transition-all"><MessageCircle size={16} /></button></>
                    )}
                    <button onClick={() => onActionDetail(tx)} className="p-3 bg-gray-50 text-black rounded-lg border border-gray-100 shadow-sm active:scale-95 transition-all"><Eye size={16} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </TableCustom>
      </div>

      {/* VIEW MOBILE */}
      <div className="lg:hidden space-y-4 font-bold">
        {!loading && data.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Tidak ada data</p>
          </div>
        )}
        {data.map((tx) => {
          const isSelected = selectedIds.includes(tx.id)
          const payable = isPayable(tx)
          const paid = Number(tx.amount_paid || 0)
          const sisa = Math.max(Number(tx.total || 0) - paid, 0)
          return (
            <div key={tx.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all font-bold ${isSelected ? 'border-black ring-1 ring-black' : 'border-gray-100'}`}>
              <div className="flex gap-4 items-center mb-4 font-bold">
                {payable && (
                  <button onClick={() => onToggleSelect(tx.id)} className={`${isSelected ? 'text-black' : 'text-gray-300'} shrink-0`}>
                    {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                  </button>
                )}
                <div className="w-16 h-16 relative rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                  {tx.featured_image ? (
                    <Image src={`/uploads/${tx.featured_image}`} alt="p" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={18} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 font-bold">
                  <p className="text-xs font-bold uppercase truncate leading-none mb-1 text-black">{tx.customer}</p>
                  <p className="text-[10px] font-bold uppercase text-gray-400 truncate mb-1">KASIR: {tx.admin_name || '-'}</p>
                  <p className={`text-sm font-bold ${tx.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-red-600'}`}>RP {Number(tx.total).toLocaleString()}</p>
                  {payable && paid > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1">DIBAYAR RP {paid.toLocaleString()} · SISA RP {sisa.toLocaleString()}</p>
                  )}
                  {tx.paid_by_name && (
                    <p className="text-[10px] font-bold uppercase text-gray-400 mt-1">TERIMA: {tx.paid_by_name}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-50 font-bold">
                {payable && (
                  <><button onClick={() => onActionBayar(tx)} className="flex items-center justify-center py-4 bg-black text-white rounded-xl"><Check size={18} /></button>
                    <button onClick={() => onActionRetur(tx)} className="flex items-center justify-center py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl"><RotateCcw size={18} /></button>
                    <button onClick={() => sendWhatsApp(tx.customer, sisa, tx.due_date, tx.whatsapp)} className="flex items-center justify-center py-4 bg-green-50 text-green-600 border border-green-100 rounded-xl"><MessageCircle size={18} /></button></>
                )}
                <button onClick={() => onActionDetail(tx)} className={`flex items-center justify-center py-4 bg-gray-50 text-black border border-gray-100 rounded-xl ${payable ? 'col-span-1' : 'col-span-4'}`}><Eye size={18} /></button>
              </div>
            </div>
          )
        })}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onChange={setPage} className="" />
      )}
    </div>
  )
}