'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Printer, Wallet, Eye, Search } from 'lucide-react'
import TableCustom from '../components/table'
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

// Filter bersama untuk ringkasan dan tabel
// $1 = cari, $2 = karyawan, $3 = dari tanggal, $4 = sampai tanggal (zona waktu WIB)
// Kalau kedua tanggal kosong, otomatis menampilkan 7 hari terakhir
const WHERE = `
  WHERE (t.customer ILIKE $1 OR t.id::text ILIKE $1)
    AND ($2::uuid IS NULL OR t.created_by = $2::uuid)
    AND (
      (
        $3::date IS NULL AND $4::date IS NULL
        AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= (NOW() AT TIME ZONE 'Asia/Jakarta')::date - 7
      )
      OR (
        ($3::date IS NOT NULL OR $4::date IS NOT NULL)
        AND ($3::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $3::date)
        AND ($4::date IS NULL OR (t.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $4::date)
      )
    )
`

export default function LaporanPenjualanPage() {
  const [tableData, setTableData] = useState<any[]>([])
  const [summary, setSummary] = useState({ omzet: 0, piutang: 0, diskon: 0 })
  const [methods, setMethods] = useState<{ method: string; amount: number }[]>([])
  const [loading, setLoading] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [showDetail, setShowDetail] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const limit = 10

  // Mencegah hasil query lama menimpa hasil query terbaru
  const requestId = useRef(0)

  // Jeda 0,4 detik setelah selesai mengetik, baru cari ke database
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchReport = useCallback(async () => {
    const myId = ++requestId.current
    setLoading(true)
    try {
      const offset = (currentPage - 1) * limit
      const baseParams = [
        `%${searchTerm}%`,
        employeeId || null,
        startDate || null,
        endDate || null
      ]

      // Ringkasan dihitung langsung di database (tidak menarik semua baris ke browser)
      const [sumRows, methodRows, rows] = await Promise.all([
        runSql(
          `SELECT
             COUNT(*)::int AS total_count,
             COALESCE(SUM(t.total) FILTER (WHERE t.status IS DISTINCT FROM 'RETURNED' AND t.payment_status = 'LUNAS'), 0) AS omzet,
             COALESCE(SUM(t.total) FILTER (WHERE t.status IS DISTINCT FROM 'RETURNED' AND t.payment_status = 'HUTANG'), 0) AS piutang,
             COALESCE(SUM(t.discount) FILTER (WHERE t.status IS DISTINCT FROM 'RETURNED'), 0) AS diskon
           FROM public."Transactions" t
           ${WHERE}`,
          baseParams
        ),
        runSql(
          `SELECT COALESCE(t.payment_method, 'CASH') AS method, SUM(t.total) AS amount
           FROM public."Transactions" t
           ${WHERE}
             AND t.status IS DISTINCT FROM 'RETURNED'
             AND t.payment_status = 'LUNAS'
           GROUP BY 1
           ORDER BY 2 DESC`,
          baseParams
        ),
        runSql(
          `SELECT t.*, p.full_name AS admin_name
           FROM public."Transactions" t
           LEFT JOIN public."Profiles" p ON p.id = t.created_by
           ${WHERE}
           ORDER BY t.created_at DESC
           LIMIT $5 OFFSET $6`,
          [...baseParams, limit, offset]
        )
      ])

      if (myId !== requestId.current) return

      const s = sumRows?.[0]
      setSummary({
        omzet: Number(s?.omzet || 0),
        piutang: Number(s?.piutang || 0),
        diskon: Number(s?.diskon || 0)
      })
      setTotalData(Number(s?.total_count) || 0)
      setMethods((methodRows || []).map((r) => ({ method: r.method, amount: Number(r.amount || 0) })))
      setTableData(rows || [])
    } catch (err) {
      console.error(err)
      if (myId !== requestId.current) return
      setSummary({ omzet: 0, piutang: 0, diskon: 0 })
      setMethods([])
      setTableData([])
      setTotalData(0)
    } finally {
      if (myId === requestId.current) setLoading(false)
    }
  }, [currentPage, startDate, endDate, searchTerm, employeeId])

  useEffect(() => { fetchReport() }, [fetchReport])

  const totalPages = Math.ceil(totalData / limit)
  const usingDefaultRange = !startDate && !endDate

  return (
    <div className="bg-white min-h-screen text-black font-sans pb-24">
      <div className="p-4 lg:p-10 border-b border-gray-100 bg-gray-50/30">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-8 print:hidden">
          <button onClick={() => window.print()} className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-xl font-bold text-xs uppercase shadow-xl flex items-center justify-center gap-4 active:scale-95">
            <Printer size={18} /> Cetak Laporan
          </button>
          <CleanupModal
            target="transactions"
            onDone={() => { if (currentPage === 1) fetchReport(); else setCurrentPage(1) }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
          <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <p className="text-gray-400 font-bold text-xs uppercase mb-2 tracking-widest leading-none">Omzet Lunas</p>
            <p className="text-xl lg:text-3xl font-bold text-green-600 tracking-tighter leading-none">Rp {summary.omzet.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <p className="text-red-400 font-bold text-xs uppercase mb-2 tracking-widest leading-none">Piutang Pending</p>
            <p className="text-xl lg:text-3xl font-bold text-red-600 tracking-tighter leading-none">Rp {summary.piutang.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <p className="text-gray-400 font-bold text-xs uppercase mb-2 tracking-widest leading-none">Total Diskon</p>
            <p className="text-xl lg:text-3xl font-bold tracking-tighter leading-none">Rp {summary.diskon.toLocaleString()}</p>
          </div>
        </div>

        {/* FITUR REKAP METODE */}
        <div className="bg-zinc-900 text-white p-6 lg:p-8 rounded-3xl shadow-2xl">
          <p className="text-zinc-400 font-bold text-xs uppercase mb-6 tracking-widest flex items-center gap-3 leading-none">
            <Wallet size={18} /> Saldo Per Metode
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {methods.length === 0 && (
              <p className="col-span-full text-xs font-bold text-zinc-500 uppercase">Belum ada transaksi lunas pada periode ini</p>
            )}
            {methods.map(({ method, amount }) => (
              <div key={method} className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-2 leading-none">{method}</p>
                <p className="text-xs lg:text-sm font-bold truncate text-white leading-none">Rp {amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-10 py-8 space-y-8">
        {/* FILTER & SEARCH */}
        <div className="space-y-3 print:hidden">
          <div className="flex flex-col xl:flex-row gap-3">
            <EmployeeFilter
              value={employeeId}
              onChange={(id) => { setEmployeeId(id); setCurrentPage(1) }}
            />
            <DateRangeFilter
              from={startDate}
              to={endDate}
              onChange={(f, t) => { setStartDate(f); setEndDate(t); setCurrentPage(1) }}
            />
            <div className="relative w-full xl:w-80 xl:ml-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="CARI SELLER / INV..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl text-xs uppercase outline-none border-none shadow-sm font-bold"
              />
            </div>
          </div>
          {usingDefaultRange && (
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
              Menampilkan 7 hari terakhir. Pilih tanggal untuk rentang lain.
            </p>
          )}
        </div>

        {/* TABLE DESKTOP */}
        <div className="hidden lg:block border border-gray-100 rounded-4xl overflow-hidden shadow-sm bg-white font-bold">
          <TableCustom headers={['Waktu', 'Customer', 'Kasir', 'Metode', 'Status', 'Total', 'Aksi']} loading={loading}>
            {tableData.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all text-black text-xs">
                <td className="p-6">
                  <div className="text-xs font-bold leading-none mb-1">{new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                  <div className="text-xs text-gray-400 uppercase leading-none font-bold">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="p-6 uppercase truncate lg:max-w-37.5">{item.customer}</td>
                <td className="p-6 uppercase">{item.admin_name || '-'}</td>
                <td className="p-6">
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg uppercase">{item.payment_method || 'CASH'}</span>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1.5 rounded-lg uppercase ${item.status === 'RETURNED' ? 'bg-orange-50 text-orange-600' : item.payment_status === 'HUTANG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {item.status === 'RETURNED' ? 'RETUR' : item.payment_status}
                  </span>
                </td>
                <td className={`p-6 text-sm tracking-tighter ${item.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-black'}`}>
                  Rp {Number(item.total || 0).toLocaleString()}
                </td>
                <td className="p-6 text-right">
                  <button onClick={() => { setSelectedTx(item); setShowDetail(true) }} className="p-4 bg-gray-50 rounded-2xl hover:bg-black hover:text-white shadow-sm">
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </TableCustom>
        </div>

        {/* MOBILE LIST (PROPER CARD) */}
        <div className="lg:hidden space-y-4">
          {tableData.map((item) => (
            <div key={item.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 font-bold">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase text-black mb-1">{item.customer}</p>
                  <p className="text-xs text-gray-400 uppercase leading-none">INV-{item.id.toString().slice(0, 8)}</p>
                  <p className="text-[10px] text-gray-400 uppercase leading-none mt-2">Kasir: {item.admin_name || '-'}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs uppercase ${item.status === 'RETURNED' ? 'bg-orange-50 text-orange-600' : item.payment_status === 'HUTANG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {item.status === 'RETURNED' ? 'RETUR' : item.payment_status}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-y border-gray-50">
                <div className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                <p className="text-sm tracking-tight text-black">Rp {Number(item.total || 0).toLocaleString()}</p>
              </div>
              <button onClick={() => { setSelectedTx(item); setShowDetail(true) }} className="w-full py-4 bg-gray-50 text-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2">
                <Eye size={16} /> Detail
              </button>
            </div>
          ))}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col items-center gap-4 py-6 px-6 bg-gray-50 rounded-3xl border border-gray-100 font-bold print:hidden">
          <p className="text-xs uppercase text-gray-400 tracking-widest">
            Halaman {currentPage} dari {totalPages || 1} • {totalData} Data
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            className=""
          />
        </div>
      </div>

      {/* MODAL DETAIL */}
      <ModalDetailOrder show={showDetail} onClose={() => setShowDetail(false)} selectedTx={selectedTx} />
    </div>
  )
}