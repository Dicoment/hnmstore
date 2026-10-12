'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Printer, Calendar, Banknote, ShoppingBag, Loader2,
  AlertCircle, User, RefreshCw, AlertTriangle, Users
} from 'lucide-react'
import EmployeeFilter from '../components/EmployeeFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import Pagination from '@/components/shop/Pagination'

export const dynamic = 'force-dynamic'

const OWNER_ROLES = ['OWNER', 'SUPERADMIN', 'SUPER_ADMIN']
const RETURN_LIMIT = 10

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

// Tanggal hari ini versi WIB, format YYYY-MM-DD
const todayWIB = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const rp = (n: any) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`

// Potongan WHERE tanggal (WIB) + karyawan yang dipakai semua query
// $1 = id karyawan (uuid / null), $2 = dari (date / null), $3 = sampai (date / null)
const WHERE_SHIFT = `
  ($1::uuid IS NULL OR t.created_by = $1::uuid)
  AND ($2::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $2::date)
  AND ($3::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $3::date)
`

export default function LaporanShiftPage() {
  const [me, setMe] = useState<{ id: string; role: string } | null>(null)
  const [filterEmp, setFilterEmp] = useState('')
  const [from, setFrom] = useState(todayWIB())
  const [to, setTo] = useState(todayWIB())

  const [summary, setSummary] = useState<any>(null)
  const [perKasir, setPerKasir] = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [retPage, setRetPage] = useState(1)
  const [retTotal, setRetTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isOwner = !!me && OWNER_ROLES.includes(me.role)
  // KARYAWAN selalu terkunci ke dirinya sendiri
  const effectiveEmp: string | null = me ? (isOwner ? (filterEmp || null) : me.id) : null

  // Identitas dari token (bukan localStorage)
  useEffect(() => {
    fetch('/api/me')
      .then(async (r) => {
        if (!r.ok) throw new Error('Gagal membaca sesi login')
        return r.json()
      })
      .then((d) => setMe({ id: d.id, role: d.role }))
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [])

  const fetchSummary = useCallback(async () => {
    if (!me) return
    try {
      setLoading(true)
      setError('')
      const params = [effectiveEmp, from || null, to || null]

      const sumSql = `
        SELECT
          (SELECT full_name FROM public."Profiles" WHERE id = $1::uuid) AS admin_name,
          COUNT(*) FILTER (WHERE t.status = 'SUCCESS') AS order_count,
          COALESCE(SUM(t.total) FILTER (WHERE t.status = 'SUCCESS' AND t.payment_status = 'LUNAS'), 0) AS cash_sales,
          COALESCE(SUM(t.total) FILTER (WHERE t.status = 'SUCCESS' AND t.payment_status = 'HUTANG'), 0) AS piutang,
          COUNT(*) FILTER (WHERE t.status = 'RETURNED') AS return_count,
          COALESCE(SUM(t.total) FILTER (WHERE t.status = 'RETURNED'), 0) AS return_amount
        FROM public."Transactions" t
        WHERE ${WHERE_SHIFT}
      `

      // Rekap per kasir hanya untuk OWNER yang belum memilih karyawan tertentu
      const kasirSql = `
        SELECT
          COALESCE(p.full_name, 'TANPA NAMA') AS kasir_name,
          COUNT(*) FILTER (WHERE t.status = 'SUCCESS') AS order_count,
          COALESCE(SUM(t.total) FILTER (WHERE t.status = 'SUCCESS' AND t.payment_status = 'LUNAS'), 0) AS cash_sales,
          COALESCE(SUM(t.total) FILTER (WHERE t.status = 'SUCCESS' AND t.payment_status = 'HUTANG'), 0) AS piutang,
          COUNT(*) FILTER (WHERE t.status = 'RETURNED') AS return_count,
          COALESCE(SUM(t.total) FILTER (WHERE t.status = 'RETURNED'), 0) AS return_amount
        FROM public."Transactions" t
        LEFT JOIN public."Profiles" p ON p.id = t.created_by
        WHERE ${WHERE_SHIFT}
        GROUP BY t.created_by, p.full_name
        ORDER BY cash_sales DESC
      `

      const [sumRows, kasirRows] = await Promise.all([
        runSql(sumSql, params),
        isOwner && !effectiveEmp ? runSql(kasirSql, params) : Promise.resolve([])
      ])

      const r = sumRows[0] || {}
      setSummary({
        adminName: r.admin_name || null,
        orderCount: Number(r.order_count || 0),
        cashSales: Number(r.cash_sales || 0),
        piutang: Number(r.piutang || 0),
        returnCount: Number(r.return_count || 0),
        returnAmount: Number(r.return_amount || 0)
      })
      setPerKasir(kasirRows)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }, [me, effectiveEmp, from, to, isOwner])

  const fetchReturns = useCallback(async () => {
    if (!me) return
    try {
      const offset = (retPage - 1) * RETURN_LIMIT
      const rows = await runSql(
        `
        SELECT t.id, t.total, t.return_reason, t.return_proof_url,
               p.full_name AS admin_name,
               COUNT(*) OVER() AS full_count
        FROM public."Transactions" t
        LEFT JOIN public."Profiles" p ON p.id = t.created_by
        WHERE t.status = 'RETURNED' AND ${WHERE_SHIFT}
        ORDER BY t.created_at DESC
        LIMIT ${RETURN_LIMIT} OFFSET ${offset}
        `,
        [effectiveEmp, from || null, to || null]
      )
      setReturns(rows)
      setRetTotal(Number(rows[0]?.full_count || 0))
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal memuat retur')
    }
  }, [me, effectiveEmp, from, to, retPage])

  useEffect(() => { fetchSummary() }, [fetchSummary])
  useEffect(() => { fetchReturns() }, [fetchReturns])

  // Ganti filter -> kembali ke halaman 1
  useEffect(() => { setRetPage(1) }, [effectiveEmp, from, to])

  const handlePrintReport = () => {
    const content = document.getElementById('report-content-to-print')?.innerHTML
    const win = window.open('', '_blank', 'width=900,height=900')
    if (win && content) {
      win.document.write(`
        <html>
          <head>
            <title>SHIFT REPORT - HNM STORE</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print { body { padding: 20px; } @page { margin: 10mm; } }
              body { font-family: sans-serif; color: black; background: white; text-transform: uppercase; }
            </style>
          </head>
          <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
            <div class="max-w-4xl mx-auto">${content}</div>
          </body>
        </html>
      `)
      win.document.close()
    }
  }

  const totalRetPages = Math.ceil(retTotal / RETURN_LIMIT)
  const periodLabel = !from && !to
    ? 'Semua Tanggal'
    : from === to
      ? fmtDate(from)
      : `${from ? fmtDate(from) : '...'} - ${to ? fmtDate(to) : '...'}`
  const kasirLabel = summary?.adminName || (isOwner && !effectiveEmp ? 'Semua Karyawan' : '-')

  if (!me && !error) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
      <p className="text-xs font-bold uppercase mt-4 text-black tracking-widest">Syncing Data...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black font-sans w-full overflow-x-hidden pb-20">
      <div className="w-full px-4 lg:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10">

        {/* FILTER (tidak ikut dicetak) */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {isOwner && (
            <EmployeeFilter value={filterEmp} onChange={(id: any) => setFilterEmp(id || '')} />
          )}
          <DateRangeFilter
            from={from}
            to={to}
            onChange={(f: any, t: any) => { setFrom(f || ''); setTo(t || '') }}
          />
          <button
            onClick={() => { fetchSummary(); fetchReturns() }}
            className="flex gap-2 bg-black text-white px-5 items-center justify-center py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Update Data
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-bold uppercase">
            {error}
          </div>
        )}

        {/* ISI LAPORAN (yang dicetak) */}
        <div className="space-y-8 lg:space-y-10" id="report-content-to-print">

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-8 border-b border-gray-100">
            <div className="space-y-2 text-center lg:text-left w-full lg:w-auto">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">HnM Store Data Penjualan Shift</p>
            </div>

            <div className="bg-gray-50 px-6 py-5 rounded-2xl border border-gray-100 flex flex-col gap-2 w-full lg:w-auto min-w-70">
              <div className="flex items-center justify-center lg:justify-start gap-3 text-black border-b border-gray-200 pb-2">
                <User size={16} className="text-gray-400" />
                <span className="text-xs font-bold uppercase tracking-wide">{kasirLabel}</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-3 text-gray-400">
                <Calendar size={16} />
                <span className="text-xs font-bold uppercase">{periodLabel}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-black" size={32} />
              <p className="text-xs font-bold uppercase mt-4 text-black tracking-widest">Syncing Data...</p>
            </div>
          ) : (
            <>
              {/* STATS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-3 shadow-sm">
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest flex justify-between">Gross Cash <ShoppingBag size={14} /></p>
                  <p className="text-2xl font-bold tracking-tight">{rp(summary?.cashSales)}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Uang Masuk Lunas &middot; {summary?.orderCount || 0} Pelanggan</p>
                </div>

                <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl space-y-3 shadow-sm">
                  <p className="text-orange-400 font-bold text-[10px] uppercase tracking-widest flex justify-between">Piutang Shift <AlertTriangle size={14} /></p>
                  <p className="text-2xl font-bold text-orange-600 tracking-tight">{rp(summary?.piutang)}</p>
                  <p className="text-[10px] font-bold text-orange-400 uppercase">Hutang Seller Periode Ini</p>
                </div>

                <div className="bg-red-50/50 border border-red-100 p-6 rounded-2xl space-y-3 shadow-sm">
                  <p className="text-red-400 font-bold text-[10px] uppercase tracking-widest flex justify-between">Total Retur <RefreshCw size={14} /></p>
                  <p className="text-2xl font-bold text-red-600 tracking-tight">{rp(summary?.returnAmount)}</p>
                  <p className="text-[10px] font-bold text-red-400 uppercase">{summary?.returnCount || 0} Transaksi</p>
                </div>

                <div className="bg-black p-6 rounded-2xl space-y-3 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500" />
                  <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest flex justify-between">Kas Bersih <Banknote size={14} className="text-green-500" /></p>
                  <p className="text-2xl font-bold text-white tracking-tighter">{rp(summary?.cashSales)}</p>
                  <p className="text-[10px] font-bold text-green-500 uppercase">Wajib Disetor / Ada di Laci</p>
                </div>
              </div>

              {/* REKAP PER KASIR (OWNER, belum pilih karyawan) */}
              {isOwner && !effectiveEmp && (
                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-3 border-l-4 border-black pl-5">
                    <Users size={20} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Rekap Per Kasir</h3>
                  </div>

                  {perKasir.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-10 text-center">
                      <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em]">Tidak ada transaksi pada periode ini</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                          <tr>
                            {['Kasir', 'Pelanggan', 'Kas Masuk', 'Piutang', 'Retur', 'Wajib Setor'].map((h) => (
                              <th key={h} className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-black">
                          {perKasir.map((k, i) => (
                            <tr key={i}>
                              <td className="p-4 text-xs font-bold uppercase">{k.kasir_name}</td>
                              <td className="p-4 text-xs font-bold">{Number(k.order_count || 0)}</td>
                              <td className="p-4 text-xs font-bold">{rp(k.cash_sales)}</td>
                              <td className="p-4 text-xs font-bold text-orange-600">{rp(k.piutang)}</td>
                              <td className="p-4 text-xs font-bold text-red-600">
                                {rp(k.return_amount)} <span className="text-gray-400">({Number(k.return_count || 0)})</span>
                              </td>
                              <td className="p-4 text-xs font-bold">{rp(k.cash_sales)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* BUKTI RETUR */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-3 border-l-4 border-black pl-5">
                  <AlertCircle size={20} />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Bukti Lampiran Retur</h3>
                </div>

                {returns.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-16 text-center">
                    <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em]">Tidak ada retur pada periode ini</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {returns.map((item) => (
                      <div key={item.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                          <img src={item.return_proof_url || 'https://placehold.co/200x200?text=HNM'} className="w-full h-full object-cover grayscale" alt="proof" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-bold text-gray-300 uppercase">
                            #{item.id?.slice(0, 8)}{item.admin_name ? ` · ${item.admin_name}` : ''}
                          </p>
                          <p className="text-[11px] font-bold text-red-600 uppercase truncate">{item.return_reason || 'Retur Barang'}</p>
                          <p className="text-md font-bold text-black">-{rp(item.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalRetPages > 1 && (
                  <div className="print:hidden">
                    <Pagination
                      currentPage={retPage}
                      totalPages={totalRetPages}
                      onChange={setRetPage}
                      className=""
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="pt-4 print:hidden">
          <button onClick={handlePrintReport} className="w-full bg-black text-white py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all active:scale-95 shadow-2xl">
            <Printer size={20} /> Cetak Laporan Resmi
          </button>
        </div>
      </div>
    </div>
  )
}