'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  History, ArrowLeft, Search,
  Loader2, ArrowRight, RefreshCw, ImageIcon, Printer
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import EmployeeFilter from '../../pos/components/EmployeeFilter'
import DateRangeFilter from '../../pos/components/DateRangeFilter'
import CleanupModal from '../../pos/components/CleanupModal'
import Pagination from '@/components/shop/Pagination'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default function HistoryStokPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1)
  const [totalData, setTotalData] = useState(0)

  // Jeda 0,4 detik setelah selesai mengetik, baru cari ke database
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * PAGE_SIZE

      // Gambar diambil lewat subquery LIMIT 1 supaya log tidak berlipat
      // kalau ada beberapa produk dengan nama yang sama
      const sql = `
        SELECT 
          sl.*, 
          p.full_name,
          COUNT(*) OVER() AS full_count,
          (
            SELECT prod.images FROM public."Product" prod
            WHERE prod.name = sl.product_name
            LIMIT 1
          ) AS product_images
        FROM public."StockLog" sl
        LEFT JOIN public."Profiles" p ON sl.created_by = p.id
        WHERE sl.product_name ILIKE $1
          AND ($2::uuid IS NULL OR sl.created_by = $2::uuid)
          AND ($3::date IS NULL OR (sl.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $3::date)
          AND ($4::date IS NULL OR (sl.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $4::date)
        ORDER BY sl.created_at DESC
        LIMIT $5 OFFSET $6
      `
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          params: [
            `%${searchTerm}%`,
            employeeId || null,
            dateFrom || null,
            dateTo || null,
            PAGE_SIZE,
            offset
          ]
        })
      })
      const result = await res.json()
      const rows = result.data || []
      setLogs(rows)
      setTotalData(Number(rows[0]?.full_count) || 0)
    } catch (err) {
      console.error('Gagal sinkron history:', err)
      setLogs([])
      setTotalData(0)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, employeeId, dateFrom, dateTo, currentPage])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handlePrint = () => {
    window.print()
  }

  const totalPages = Math.ceil(totalData / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-white text-black font-sans w-full overflow-x-hidden pb-10">
      {/* HEADER NAV */}
      <div className="border-b border-gray-100 px-4 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between sticky top-0 z-40 bg-white/90 backdrop-blur-md w-full gap-4 print:hidden">
        <Link href="/admin/stok" className="flex items-center gap-2 text-gray-400 hover:text-black transition-all">
          <ArrowLeft size={18} />
          <span className="text-xs uppercase tracking-widest font-bold">Kembali ke Stok</span>
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          <CleanupModal
            target="stocklog"
            onDone={() => { if (currentPage === 1) fetchLogs(); else setCurrentPage(1) }}
          />
          <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-50 text-black px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all hover:bg-gray-100 border border-gray-100 shadow-sm">
            <Printer size={16} /> Cetak
          </button>
          <button onClick={fetchLogs} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-4 lg:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10 font-bold">
        {/* HERO SECTION */}
        <div className="flex flex-col gap-6 pb-8 border-b border-gray-100 font-bold">
          <div className="space-y-2 text-center lg:text-left w-full lg:w-auto font-bold">
            <h1 className="text-3xl lg:text-4xl uppercase tracking-tighter flex items-center justify-center lg:justify-start gap-4 text-black leading-none font-bold">
              <History size={32} className="print:hidden" /> Mutasi Stok
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest leading-none font-bold">
              HnM Store • {totalData} Log Record
            </p>
          </div>

          {/* FILTER BAR */}
          <div className="flex flex-col xl:flex-row gap-3 w-full print:hidden">
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
                value={searchInput}
                placeholder="CARI NAMA SEPATU..."
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs uppercase outline-none focus:ring-1 focus:ring-black transition-all text-black shadow-sm font-bold"
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* LOADING INLINE (filter tidak ikut hilang) */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center text-black font-bold uppercase tracking-widest text-xs">
            <Loader2 className="animate-spin mb-4" size={32} /> Syncing Mutasi...
          </div>
        )}

        {/* TABLE VIEW */}
        {!loading && (
          <div className="bg-white lg:border lg:border-gray-100 lg:rounded-xl overflow-hidden lg:shadow-sm font-bold">
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block font-bold">
              <table className="w-full text-left border-collapse font-bold">
                <thead className="bg-gray-50 text-gray-400 border-b border-gray-100 font-bold">
                  <tr>
                    <th className="p-6 text-xs uppercase tracking-widest text-black font-bold">Waktu</th>
                    <th className="p-6 text-xs uppercase tracking-widest text-black font-bold">Produk</th>
                    <th className="p-6 text-xs uppercase tracking-widest text-center text-black font-bold">Tipe</th>
                    <th className="p-6 text-xs uppercase tracking-widest text-center text-black font-bold">Mutasi</th>
                    <th className="p-6 text-xs uppercase tracking-widest text-black font-bold">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-black font-bold">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-32 text-center text-gray-300 uppercase tracking-widest text-xs font-bold">Belum ada catatan mutasi stok</td>
                    </tr>
                  ) : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-all group print:break-inside-avoid font-bold">
                      <td className="p-6 font-bold">
                        <div className="text-xs uppercase text-black leading-none font-bold">
                          {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-400 uppercase mt-2 leading-none font-bold">
                          {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                      </td>
                      <td className="p-6 font-bold">
                        <div className="flex items-center gap-4 font-bold">
                          <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0 font-bold">
                            {log.product_images?.[0] ? (
                              <Image src={`/uploads/${log.product_images[0]}`} alt="p" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-300 font-bold"><ImageIcon size={16} /></div>
                            )}
                          </div>
                          <div className="min-w-0 font-bold">
                            <div className="text-xs uppercase text-black truncate max-w-50 leading-none font-bold">{log.product_name}</div>
                            <div className="text-xs text-gray-400 uppercase mt-2 leading-none font-bold">Size: <span className="text-black font-bold">{log.size_value}</span></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center font-bold">
                        <span className={`px-4 py-1.5 rounded-lg text-xs uppercase tracking-widest border font-bold ${
                          log.type === 'MASUK' ? 'bg-green-50 text-green-700 border-green-100' :
                          log.type === 'TERJUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          log.type === 'RETUR' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-gray-50 text-gray-600 border-gray-100'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-6 font-bold">
                        <div className="flex items-center justify-center gap-4 font-bold">
                          <span className="text-gray-300 text-xs font-bold">{log.old_stock}</span>
                          <ArrowRight size={14} className="text-gray-200" />
                          <span className=" text-sm text-black font-bold">{log.new_stock}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${log.new_stock > log.old_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : log.new_stock - log.old_stock}
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-xs uppercase text-black leading-none font-bold">
                        {log.full_name || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW */}
            <div className="lg:hidden space-y-4 font-bold">
              {logs.length === 0 && (
                <div className="py-20 text-center text-gray-300 uppercase tracking-widest text-xs font-bold">Belum ada catatan mutasi stok</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4 font-bold">
                  <div className="flex justify-between items-start border-b border-gray-50 pb-3 font-bold">
                    <div className="text-xs text-gray-400 uppercase leading-none font-bold">
                      {new Date(log.created_at).toLocaleDateString('id-ID')} • {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs uppercase border font-bold ${
                      log.type === 'MASUK' ? 'bg-green-50 text-green-700 border-green-100' :
                      log.type === 'TERJUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      log.type === 'RETUR' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {log.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-bold">
                    <div className="w-14 h-14 relative rounded-lg overflow-hidden bg-gray-50 shrink-0 font-bold">
                      {log.product_images?.[0] ? <Image src={`/uploads/${log.product_images[0]}`} alt="p" fill className="object-cover" unoptimized /> : <div className="flex items-center justify-center h-full text-gray-300 font-bold"><ImageIcon size={16} /></div>}
                    </div>
                    <div className="min-w-0 flex-1 font-bold">
                      <div className="text-xs uppercase text-black truncate leading-none font-bold">{log.product_name}</div>
                      <div className="text-xs text-gray-400 uppercase mt-2 leading-none font-bold">Size: <span className="text-black font-bold">{log.size_value}</span></div>
                      <div className="text-[10px] text-gray-400 uppercase mt-2 leading-none font-bold italic">By: {log.full_name || 'System'}</div>
                    </div>
                    <div className="text-right font-bold">
                      <div className="flex items-center justify-end gap-2 font-bold">
                        <span className="text-gray-300 text-xs font-bold">{log.old_stock}</span>
                        <ArrowRight size={10} className="text-gray-200" />
                        <span className="text-xs text-black font-bold">{log.new_stock}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalData > 0 && (
          <div className="flex flex-col items-center gap-4 py-6 px-6 bg-gray-50 rounded-3xl border border-gray-100 print:hidden">
            <p className="text-xs uppercase text-gray-400 tracking-widest leading-none">
              Halaman {currentPage} dari {totalPages} • Total {totalData} Log
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              className=""
            />
          </div>
        )}
      </div>
    </div>
  )
}