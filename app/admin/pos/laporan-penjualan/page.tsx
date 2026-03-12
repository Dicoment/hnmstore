'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ArrowLeft, Printer, X, Loader2, ChevronLeft, ChevronRight, Wallet, Eye, ShoppingBag, User, Search
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import TableCustom from '../components/table'

export default function LaporanPenjualanPage() {
  const [tableData, setTableData] = useState<any[]>([]) 
  const [summaryData, setSummaryData] = useState<any[]>([]) 
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const limit = 10

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const offset = (currentPage - 1) * limit
      const params: any[] = []
      let whereClause = ` WHERE (customer ILIKE $1 OR id::text ILIKE $1)`
      params.push(`%${searchTerm}%`)

      if (startDate && endDate) {
        whereClause += ` AND created_at >= $2 AND created_at <= $3`
        params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`)
      } else {
        whereClause += ` AND created_at >= CURRENT_DATE - INTERVAL '7 days'`
      }

      const resAll = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ 
          sql: `SELECT total, payment_status, payment_method, status, discount FROM public."Transactions" ${whereClause}`, 
          params 
        })
      })
      const resultAll = await resAll.json()
      setSummaryData(resultAll.data || [])
      setTotalData(resultAll.data?.length || 0)

      const resTable = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ 
          sql: `SELECT * FROM public."Transactions" ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, 
          params: [...params, limit, offset]
        })
      })
      const resultTable = await resTable.json()
      setTableData(resultTable.data || [])

    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, startDate, endDate, searchTerm])

  useEffect(() => { fetchReport() }, [fetchReport])

  const totalOmzet = summaryData
    .filter(i => i.status !== 'RETURNED' && i.payment_status === 'LUNAS')
    .reduce((acc, curr) => acc + Number(curr.total || 0), 0)

  const totalPiutang = summaryData
    .filter(i => i.status !== 'RETURNED' && i.payment_status === 'HUTANG')
    .reduce((acc, curr) => acc + Number(curr.total || 0), 0)

  const totalDiskon = summaryData
    .filter(i => i.status !== 'RETURNED')
    .reduce((acc, curr) => acc + Number(curr.discount || 0), 0)

  const paymentMethodSummary = summaryData.reduce((acc: any, curr: any) => {
    if (curr.status !== 'RETURNED' && curr.payment_status === 'LUNAS') {
      const method = curr.payment_method || 'CASH'
      acc[method] = (acc[method] || 0) + Number(curr.total || 0)
    }
    return acc
  }, {})

  return (
    <div className="bg-white min-h-screen text-black font-sans pb-24">
      <div className="p-4 lg:p-10 border-b border-gray-100 bg-gray-50/30">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="space-y-1">
            <Link href="/admin/pos" className="flex items-center gap-2 text-gray-400 hover:text-black text-xs font-bold uppercase mb-1 tracking-widest transition-all">
              <ArrowLeft size={16}/> Back to POS
            </Link>
            <h1 className="text-xl lg:text-3xl font-bold uppercase tracking-tighter leading-none">Laporan Keuangan</h1>
          </div>
          <button onClick={() => window.print()} className="w-full lg:w-auto bg-black text-white px-8 py-4 rounded-xl font-bold text-xs uppercase shadow-xl flex items-center justify-center gap-4 active:scale-95 print:hidden">
            <Printer size={18} /> Cetak Laporan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
          <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <p className="text-gray-400 font-bold text-xs uppercase mb-2 tracking-widest leading-none">Omzet Lunas</p>
            <p className="text-xl lg:text-3xl font-bold text-green-600 tracking-tighter leading-none">Rp {totalOmzet.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <p className="text-red-400 font-bold text-xs uppercase mb-2 tracking-widest leading-none">Piutang Pending</p>
            <p className="text-xl lg:text-3xl font-bold text-red-600 tracking-tighter leading-none">Rp {totalPiutang.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <p className="text-gray-400 font-bold text-xs uppercase mb-2 tracking-widest leading-none">Total Diskon</p>
            <p className="text-xl lg:text-3xl font-bold tracking-tighter leading-none">Rp {totalDiskon.toLocaleString()}</p>
          </div>
        </div>

        {/* FITUR REKAP METODE (GAK GUE HAPUS LAGI ANJING) */}
        <div className="bg-zinc-900 text-white p-6 lg:p-8 rounded-3xl shadow-2xl">
          <p className="text-zinc-400 font-bold text-xs uppercase mb-6 tracking-widest flex items-center gap-3 leading-none">
            <Wallet size={18}/> Saldo Per Metode
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(paymentMethodSummary).map(([method, amount]: any) => (
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
        <div className="flex flex-col lg:flex-row gap-4 print:hidden bg-gray-50 p-6 rounded-3xl border border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="CARI SELLER / INV..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-xs font-bold uppercase outline-none border border-gray-100 focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-96">
            <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="bg-white p-4 rounded-2xl text-xs font-bold border border-gray-100 outline-none w-full"/>
            <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="bg-white p-4 rounded-2xl text-xs font-bold border border-gray-100 outline-none w-full"/>
          </div>
        </div>

        {/* TABLE DESKTOP */}
        <div className="hidden lg:block border border-gray-100 rounded-4xl overflow-hidden shadow-sm bg-white font-bold">
          <TableCustom headers={['Waktu', 'Customer', 'Metode', 'Status', 'Total', 'Aksi']} loading={loading}>
            {tableData.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all text-black text-xs">
                <td className="p-6">
                  <div className="text-xs font-bold leading-none mb-1">{new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                  <div className="text-xs text-gray-400 uppercase leading-none font-bold">{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </td>
                <td className="p-6 uppercase truncate lg:max-w-37.5">{item.customer}</td>
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
                  <button onClick={() => setSelectedTransaction(item)} className="p-4 bg-gray-50 rounded-2xl hover:bg-black hover:text-white shadow-sm">
                    <Eye size={18}/>
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
                  <p className="text-xs text-gray-400 uppercase leading-none">INV-{item.id.toString().slice(0,8)}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs uppercase ${item.status === 'RETURNED' ? 'bg-orange-50 text-orange-600' : item.payment_status === 'HUTANG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {item.status === 'RETURNED' ? 'RETUR' : item.payment_status}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-y border-gray-50">
                <div className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                <p className="text-sm tracking-tight text-black">Rp {Number(item.total || 0).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedTransaction(item)} className="w-full py-4 bg-gray-50 text-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2">
                <Eye size={16}/> Detail
              </button>
            </div>
          ))}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-6 px-6 bg-gray-50 rounded-3xl border border-gray-100 font-bold">
          <p className="text-xs uppercase text-gray-400 tracking-widest">Page {currentPage} • {totalData} Data</p>
          <div className="flex gap-3">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-4 bg-white rounded-2xl disabled:opacity-30 border border-gray-100 shadow-sm transition-all"><ChevronLeft size={20}/></button>
            <button disabled={currentPage * limit >= totalData} onClick={() => setCurrentPage(prev => prev + 1)} className="p-4 bg-white rounded-2xl disabled:opacity-30 border border-gray-100 shadow-sm transition-all"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-4xl w-full max-w-md overflow-hidden shadow-2xl font-bold">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xs uppercase tracking-widest flex items-center gap-3 text-black"><ShoppingBag size={18}/> Detail Order</h2>
              <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
               <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs uppercase">
                 <User size={16}/> {selectedTransaction.customer}
               </div>
               <div className="space-y-3">
                {(() => {
                  let items = typeof selectedTransaction.items === 'string' ? JSON.parse(selectedTransaction.items) : selectedTransaction.items;
                  return items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 border border-gray-100 rounded-2xl bg-white items-center shadow-sm">
                      <div className="w-12 h-12 relative rounded-xl overflow-hidden shrink-0 border border-gray-100">
                        <Image src={item.image ? `/api/media/view?bucket=ProductImage&name=${item.image}` : '/placeholder.png'} alt="p" fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase truncate text-black">{item.name}</p>
                        <p className="text-xs text-gray-400 uppercase mt-1 leading-none font-bold">SZ: {item.size} | {item.quantity} Ps</p>
                      </div>
                      <p className="text-xs font-bold text-black">Rp {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs uppercase text-gray-400 font-bold leading-none">Total Nota</span>
              <span className="text-2xl text-red-600 tracking-tighter font-bold leading-none">Rp {Number(selectedTransaction.total).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}