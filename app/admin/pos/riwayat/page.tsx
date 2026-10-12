'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, RotateCcw, Eye, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import TableCustom from '../components/table'
import ModalRetur from '../components/modalretur'
import EmployeeFilter from '../components/EmployeeFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import CleanupModal from '../components/CleanupModal'
import Pagination from '@/components/shop/Pagination'
import ModalDetailOrder from '@/components/modaldetailorder'

// Helper: jalankan SQL dan lempar error kalau database menolak
const runSql = async (sql: string, params: any[] = []) => {
  const res = await fetch('/api/vps-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
  })
  const result = await res.json()
  if (!res.ok || result.error) throw new Error(result.error || 'Query gagal')
  return result.data as any[]
}

export default function RiwayatTransaksiPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalData, setTotalData] = useState(0)

  // DETAIL & RETUR STATE
  const [showDetail, setShowDetail] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [showRetur, setShowRetur] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [isReturning, setIsReturning] = useState(false)
  const [returnFile, setReturnFile] = useState<File | null>(null)

  const fetchRiwayat = useCallback(async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * pageSize

      const sql = `
        SELECT 
          t.*, 
          p.full_name AS admin_name,
          COUNT(*) OVER() as full_count,
          (
            SELECT images FROM public."Product" 
            WHERE id = (
              SELECT (value->>'productId')::uuid
              FROM jsonb_array_elements(t.items::jsonb) 
              LIMIT 1
            )
            LIMIT 1
          ) as product_images
        FROM public."Transactions" t 
        LEFT JOIN public."Profiles" p ON p.id = t.created_by
        WHERE (t.customer ILIKE $1 OR t.id::text ILIKE $1)
          AND ($4::uuid IS NULL OR t.created_by = $4::uuid)
          AND ($5::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $5::date)
          AND ($6::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $6::date)
        ORDER BY t.created_at DESC 
        LIMIT $2 OFFSET $3
      `

      const rows = await runSql(sql, [
        `%${search}%`,
        pageSize,
        offset,
        employeeId || null,
        dateFrom || null,
        dateTo || null
      ])
      setData(rows || [])
      setTotalData(Number(rows?.[0]?.full_count) || 0)
    } catch (err) {
      console.error(err)
      setData([])
      setTotalData(0)
    } finally {
      setLoading(false)
    }
  }, [search, currentPage, pageSize, employeeId, dateFrom, dateTo])

  useEffect(() => { fetchRiwayat() }, [fetchRiwayat])

  const handleProcessReturn = async () => {
    if (!selectedTx || !returnReason) return alert('Alasan wajib diisi!')
    if (selectedTx.status === 'RETURNED') return alert('Transaksi ini sudah diretur!')
    setIsReturning(true)
    try {
      // Identitas admin dari token login (server), bukan localStorage
      const meRes = await fetch('/api/me')
      const me = await meRes.json()
      const adminId: string | null = me?.id ?? null
      if (!meRes.ok || !adminId) {
        alert('Sesi login tidak valid, silakan login ulang.')
        setIsReturning(false)
        return
      }

      const items = typeof selectedTx.items === 'string' ? JSON.parse(selectedTx.items) : selectedTx.items

      for (const item of items) {
        const stRows = await runSql(
          `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`,
          [item.stockId]
        )
        const currentSt = stRows?.[0]?.stock || 0

        await runSql(
          `UPDATE public."ProductSizeStock" SET stock = stock + $1 WHERE id = $2`,
          [item.quantity, item.stockId]
        )

        await runSql(
          `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by, created_at) 
           VALUES ($1, $2, $3, $4, 'RETUR', $5, $6, NOW())`,
          [item.name, item.size, currentSt, currentSt + item.quantity, `Retur: ${returnReason}`, adminId]
        )
      }

      await runSql(
        `UPDATE public."Transactions" SET status = 'RETURNED', return_reason = $2 WHERE id = $1`,
        [selectedTx.id, returnReason]
      )

      alert('Retur Berhasil & Mutasi Stok Dicatat!')
      setShowRetur(false)
      setReturnReason('')
      fetchRiwayat()
    } catch (err: any) {
      console.error(err)
      alert('Gagal memproses retur: ' + (err?.message || ''))
    } finally {
      setIsReturning(false)
    }
  }

  const totalPages = Math.ceil(totalData / pageSize)

  return (
    <div className="min-h-screen bg-white p-4 lg:p-10 space-y-6 text-black font-sans pb-24 font-bold">

      {/* HEADER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold uppercase tracking-tighter leading-none">Riwayat Penjualan</h1>
          <CleanupModal
            target="transactions"
            onDone={() => { if (currentPage === 1) fetchRiwayat(); else setCurrentPage(1) }}
          />
        </div>

        <div className="flex flex-col xl:flex-row gap-3 w-full">
          <EmployeeFilter
            value={employeeId}
            onChange={(id) => { setEmployeeId(id); setCurrentPage(1) }}
          />
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); setCurrentPage(1) }}
          />
          <div className="relative w-full xl:w-80 xl:ml-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="CARI NAMA / INV..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl text-xs uppercase outline-none border-none shadow-sm font-bold"
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            />
          </div>
        </div>
      </div>

      {/* TABLE DESKTOP */}
      <div className="hidden lg:block border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
        <TableCustom headers={['Waktu', 'Foto', 'Pelanggan', 'Kasir', 'Total', 'Status', 'Aksi']} loading={loading}>
          {data.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50 transition-all border-b border-gray-50">
              <td className="p-5 text-xs">
                {new Date(tx.created_at).toLocaleDateString('id-ID')}<br />
                <span className="text-gray-400 uppercase">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB</span>
              </td>
              <td className="p-5">
                <div className="w-14 h-14 relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                  {tx.product_images?.[0] ? (
                    <Image src={`/uploads/${tx.product_images[0]}`} alt="p" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={20} /></div>
                  )}
                </div>
              </td>
              <td className="p-5">
                <p className="text-xs uppercase text-black truncate max-w-37">{tx.customer}</p>
                <p className="text-[11px] text-gray-400 uppercase">INV-{tx.id.toString().slice(0, 8)}</p>
              </td>
              <td className="p-5 text-xs uppercase">{tx.admin_name || '-'}</td>
              <td className={`p-5 text-sm ${tx.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-black'}`}>RP {Number(tx.total).toLocaleString()}</td>
              <td className="p-5">
                <span className={`text-[11px] px-3 py-1.5 rounded-lg uppercase ${tx.status === 'RETURNED' ? 'bg-gray-100 text-gray-400' : tx.payment_status === 'HUTANG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {tx.status === 'RETURNED' ? 'RETUR' : tx.payment_status}
                </span>
              </td>
              <td className="p-5 text-right">
                <div className="flex gap-2 justify-end">
                  {tx.status !== 'RETURNED' && (
                    <button onClick={() => { setSelectedTx(tx); setShowRetur(true) }} className="p-3.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><RotateCcw size={18} /></button>
                  )}
                  <button onClick={() => { setSelectedTx(tx); setShowDetail(true) }} className="p-3.5 bg-gray-50 text-black rounded-2xl hover:bg-black hover:text-white transition-all"><Eye size={18} /></button>
                </div>
              </td>
            </tr>
          ))}
        </TableCustom>
      </div>

      {/* MOBILE LIST */}
      <div className="lg:hidden space-y-4">
        {data.map((tx) => (
          <div key={tx.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-16 h-16 relative rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                  {tx.product_images?.[0] ? <Image src={`/uploads/${tx.product_images[0]}`} alt="p" fill className="object-cover" unoptimized /> : <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={18} /></div>}
                </div>
                <div>
                  <p className="text-xs uppercase text-black truncate pr-4">{tx.customer}</p>
                  <p className="text-[11px] text-gray-400 uppercase">INV-{tx.id.toString().slice(0, 8)}</p>
                  <p className="text-[11px] text-gray-400 uppercase">Kasir: {tx.admin_name || '-'}</p>
                  <p className="text-sm mt-1 text-black">RP {Number(tx.total).toLocaleString()}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-lg uppercase ${tx.status === 'RETURNED' ? 'bg-gray-100 text-gray-400' : tx.payment_status === 'HUTANG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {tx.status === 'RETURNED' ? 'RETUR' : tx.payment_status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
              <button onClick={() => { setSelectedTx(tx); setShowDetail(true) }} className="flex items-center justify-center gap-2 py-4 bg-gray-50 text-black rounded-2xl text-xs uppercase leading-none font-bold"><Eye size={16} /> Detail</button>
              {tx.status !== 'RETURNED' && (
                <button onClick={() => { setSelectedTx(tx); setShowRetur(true) }} className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl text-xs uppercase leading-none font-bold"><RotateCcw size={16} /> Retur</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col items-center gap-4 py-6 px-6 bg-gray-50 rounded-3xl border border-gray-100">
        <p className="text-xs uppercase text-gray-400 tracking-widest leading-none">
          Total: {totalData} Transaksi • Halaman {currentPage} dari {totalPages || 1}
        </p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
          className=""
        />
      </div>

      {/* MODAL DETAIL */}
      <ModalDetailOrder
        show={showDetail}
        onClose={() => setShowDetail(false)}
        selectedTx={selectedTx}
      />

      <ModalRetur
        show={showRetur} onClose={() => setShowRetur(false)}
        selectedTx={selectedTx} returnReason={returnReason}
        setReturnReason={setReturnReason} isReturning={isReturning}
        handleProcessReturn={handleProcessReturn}
        returnFile={returnFile} setReturnFile={setReturnFile}
      />
    </div>
  )
}