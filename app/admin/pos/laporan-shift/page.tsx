'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ArrowLeft, Printer, 
  Calendar, Banknote, ShoppingBag, Loader2,
  AlertCircle, User, RefreshCw
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

      const sql = `
        SELECT 
          (SELECT full_name FROM public."Profiles" WHERE email = $1 LIMIT 1) as admin_name,
          (SELECT json_agg(t.*) FROM public."Transactions" t 
            WHERE t.status = 'SUCCESS' AND t.created_at >= $2) as sales,
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
        const salesData = dbResult.sales || []
        const returnData = dbResult.returned || []
        const totalGross = salesData.reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0)
        const totalReturnAmount = returnData.reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0)

        // LOGIC ASLI LU
        setReport({ totalGross, totalReturnAmount, netSales: totalGross, orderCount: salesData.length, returnCount: returnData.length })
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
      {/* HEADER NAV - RESPONSIVE PADDING */}
      <div className="border-b border-gray-100 px-4 lg:px-10 py-6 flex items-center justify-between sticky top-0 z-40 bg-white/90 backdrop-blur-md w-full print:hidden">
        <Link href="/admin/pos" className="flex items-center gap-2 text-gray-400 hover:text-black transition-all">
          <ArrowLeft size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">POS</span>
        </Link>
        <button onClick={fetchData} className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="w-full px-4 lg:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10" id="report-content-to-print">
        
        {/* HERO SECTION - RATA & RESPONSIF */}
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

        {/* STATS GRID - 1 COL MOBILE / 3 COLS DESKTOP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 border border-gray-100 p-8 rounded-2xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center text-gray-400 font-bold text-xs uppercase tracking-widest">
              <span>Gross Sales</span><ShoppingBag size={18}/>
            </div>
            <p className="text-3xl font-bold tracking-tight">Rp {(report?.totalGross || 0).toLocaleString('id-ID')}</p>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{report?.orderCount || 0} Transaksi</p>
          </div>

          <div className="bg-red-50/50 border border-red-100 p-8 rounded-2xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center text-red-400 font-bold text-xs uppercase tracking-widest">
              <span>Total Retur</span><RefreshCw size={18}/>
            </div>
            <p className="text-3xl font-bold text-red-600 tracking-tight">Rp {(report?.totalReturnAmount || 0).toLocaleString('id-ID')}</p>
            <p className="text-[12px] font-bold text-red-400 uppercase tracking-widest">{report?.returnCount || 0} Items</p>
          </div>

          <div className="bg-black p-8 rounded-2xl space-y-4 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-2 h-full bg-green-500" />
            <div className="flex justify-between items-center text-gray-500 font-bold text-xs uppercase tracking-widest">
              <span>Kas Bersih</span><Banknote size={18} className="text-green-500"/>
            </div>
            <p className="text-4xl font-bold text-white tracking-tighter">Rp {(report?.netSales || 0).toLocaleString('id-ID')}</p>
            <p className="text-[12px] font-bold text-green-500 uppercase tracking-widest">Setoran Laci</p>
          </div>
        </div>

        {/* LAMPIRAN RETUR - GRID RESPONSIVE */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3 border-l-4 border-black pl-5">
            <AlertCircle size={20} />
            <h3 className="text-sm font-bold uppercase tracking-widest">Bukti Lampiran Retur</h3>
          </div>
          
          {returns.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-20 text-center">
              <p className="text-[12px] font-bold text-gray-300 uppercase tracking-[0.2em]">Tidak ada data retur shift ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {returns.map((item) => (
                <div key={item.id} className="p-5 bg-white border border-gray-100 rounded-2xl hover:border-black transition-all group flex items-center gap-5 shadow-sm">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                    <img 
                      src={item.return_proof_url || 'https://placehold.co/200x200?text=NO+IMAGE'} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                      alt="proof" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">#{item.id?.slice(0,8)}</p>
                    <p className="text-[12px] font-bold text-red-600 uppercase truncate mt-1">{item.return_reason || 'Retur Sepatu'}</p>
                    <p className="text-lg font-bold mt-1 text-black">-Rp {Number(item.total || 0).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER ACTION */}
        <div className="pt-10 print:hidden">
          <button 
            onClick={handlePrintReport}
            className="w-full bg-black text-white py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all active:scale-95 shadow-2xl"
          >
            <Printer size={20} /> Cetak Laporan Resmi
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { padding: 0 !important; background: white !important; }
          .rounded-2xl, .rounded-xl { border-radius: 8px !important; border: 1px solid #eee !important; }
          .shadow-2xl, .shadow-sm { box-shadow: none !important; }
        }
      `}</style>
    </div>
  )
}