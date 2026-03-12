'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ArrowLeft, Printer, 
  Calendar, Banknote, ShoppingBag, Loader2,
  AlertCircle, User, RefreshCw, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function LaporanShiftPage() {
  const [report, setReport] = useState<any>(null)
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const userEmail = localStorage.getItem('user_email')
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)

      // Tambahkan filter status pembayaran agar bisa dipisah antara Kas dan Piutang
      const sql = `
        SELECT 
          (SELECT full_name FROM public."Profiles" WHERE email = $1 LIMIT 1) as admin_name,
          (SELECT json_agg(t.*) FROM public."Transactions" t 
            WHERE t.status = 'SUCCESS' AND t.created_at >= $2) as all_sales,
          (SELECT json_agg(t.*) FROM public."Transactions" t 
            WHERE t.status = 'RETURNED' AND t.created_at >= $2) as returned
      `
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params: [userEmail || '', startOfDay.toISOString()] })
      })
      const result = await res.json()
      
      if (result.data && result.data[0]) {
        const dbResult = result.data[0]
        setAdminName(dbResult.admin_name || 'HnM Store Owner')
        
        const salesData = dbResult.all_sales || []
        const returnData = dbResult.returned || []

        // --- LOGIC PERHITUNGAN SHIFT ---
        
// 1. Total Penjualan Lunas yang TIDAK diretur (Duit yang beneran stay di laci)
const totalCashSales = salesData
  .filter((t: any) => t.payment_status === 'LUNAS' && t.status !== 'RETURNED')
  .reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0)

// 2. Total Piutang yang TIDAK diretur
const totalPiutangShift = salesData
  .filter((t: any) => t.payment_status === 'HUTANG' && t.status !== 'RETURNED')
  .reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0)

// 3. Total Retur (Sekadar info jumlah barang yang balik, nilainya tidak memotong kas lagi)
const totalReturnAmount = returnData.reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0)

// 4. Kas Bersih = Hanya Uang Lunas yang transaksinya masih valid
const netSales = totalCashSales

setReport({ 
  totalCashSales, 
  totalPiutangShift, 
  totalReturnAmount, 
  netSales, 
  orderCount: salesData.filter((t: any) => t.status !== 'RETURNED').length, 
  returnCount: returnData.length 
})
        setReturns(returnData)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePrintReport = () => {
    const content = document.getElementById('report-content-to-print')?.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=900');
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
      `);
      win.document.close();
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
      <p className="text-xs font-bold uppercase mt-4 text-black tracking-widest">Syncing Data...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black font-sans w-full overflow-x-hidden pb-20">
      <div className="border-b border-gray-100 px-4 lg:px-10 py-6 flex items-center justify-between sticky top-0 z-40 bg-white/90 backdrop-blur-md w-full print:hidden">
        <Link href="/admin/pos" className="flex items-center gap-2 text-gray-400 hover:text-black transition-all">
          <ArrowLeft size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">POS Utama</span>
        </Link>
        <button onClick={fetchData} className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Update Data
        </button>
      </div>

      <div className="w-full px-4 lg:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10" id="report-content-to-print">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-8 border-b border-gray-100">
          <div className="space-y-2 text-center lg:text-left w-full lg:w-auto">
            <h1 className="text-3xl lg:text-4xl font-bold uppercase tracking-tighter leading-none">Laporan Shift</h1>
            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">HnM Store • Daily Kasir Terminal</p>
          </div>
          <div className="bg-gray-50 px-6 py-5 rounded-2xl border border-gray-100 flex flex-col gap-2 w-full lg:w-auto min-w-70">
            <div className="flex items-center justify-center lg:justify-start gap-3 text-black border-b border-gray-200 pb-2">
              <User size={16} className="text-gray-400" />
              <span className="text-xs font-bold uppercase tracking-wide">{adminName}</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3 text-gray-400">
              <Calendar size={16} />
              <span className="text-xs font-bold uppercase">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* STATS GRID - 4 COLS (Tambah Kotak Piutang) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-3 shadow-sm">
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest flex justify-between">Gross Cash <ShoppingBag size={14}/></p>
            <p className="text-2xl font-bold tracking-tight">Rp {(report?.totalCashSales || 0).toLocaleString('id-ID')}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Uang Masuk Lunas</p>
          </div>

          <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl space-y-3 shadow-sm">
            <p className="text-orange-400 font-bold text-[10px] uppercase tracking-widest flex justify-between">Piutang Shift <AlertTriangle size={14}/></p>
            <p className="text-2xl font-bold text-orange-600 tracking-tight">Rp {(report?.totalPiutangShift || 0).toLocaleString('id-ID')}</p>
            <p className="text-[10px] font-bold text-orange-400 uppercase">Hutang Seller Hari Ini</p>
          </div>

          <div className="bg-red-50/50 border border-red-100 p-6 rounded-2xl space-y-3 shadow-sm">
            <p className="text-red-400 font-bold text-[10px] uppercase tracking-widest flex justify-between">Total Retur <RefreshCw size={14}/></p>
            <p className="text-2xl font-bold text-red-600 tracking-tight">Rp {(report?.totalReturnAmount || 0).toLocaleString('id-ID')}</p>
            <p className="text-[10px] font-bold text-red-400 uppercase">{report?.returnCount || 0} Transaksi</p>
          </div>

          <div className="bg-black p-6 rounded-2xl space-y-3 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500" />
            <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest flex justify-between">Kas Bersih <Banknote size={14} className="text-green-500"/></p>
            <p className="text-2xl font-bold text-white tracking-tighter">Rp {(report?.netSales || 0).toLocaleString('id-ID')}</p>
            <p className="text-[10px] font-bold text-green-500 uppercase">Wajib Ada di Laci</p>
          </div>
        </div>

        {/* BUKTI RETUR */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3 border-l-4 border-black pl-5">
            <AlertCircle size={20} />
            <h3 className="text-sm font-bold uppercase tracking-widest">Bukti Lampiran Retur</h3>
          </div>
          
          {returns.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-16 text-center">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em]">Tidak ada retur shift ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {returns.map((item) => (
                <div key={item.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                    <img src={item.return_proof_url || 'https://placehold.co/200x200?text=HNM'} className="w-full h-full object-cover grayscale" alt="proof" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-bold text-gray-300 uppercase">#{item.id?.slice(0,8)}</p>
                    <p className="text-[11px] font-bold text-red-600 uppercase truncate">{item.return_reason || 'Retur Barang'}</p>
                    <p className="text-md font-bold text-black">-Rp {Number(item.total || 0).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-10 print:hidden">
          <button onClick={handlePrintReport} className="w-full bg-black text-white py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all active:scale-95 shadow-2xl">
            <Printer size={20} /> Cetak Laporan Resmi
          </button>
        </div>
      </div>
    </div>
  )
}