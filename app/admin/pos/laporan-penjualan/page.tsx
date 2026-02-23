'use client'

import { useState, useEffect } from 'react'
import { 
  Download, Search, RotateCcw, 
  FileSpreadsheet, ArrowLeft, DollarSign, ShoppingBag, TrendingUp,
  Eye, Printer, X, Camera, Loader2
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function LaporanPenjualanPage() {
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)

  useEffect(() => {
    fetchReport()
  }, [])

  // --- LOGIC ASLI LU (TIDAK DISENTUH) ---
  async function fetchReport() {
    setLoading(true)
    try {
      let sql = `SELECT * FROM public."Transactions"`
      const params = []
      
      if (startDate && endDate) {
        sql += ` WHERE created_at >= $1 AND created_at <= $2`
        params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`)
      }
      
      sql += ` ORDER BY created_at DESC`

      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql, params })
      })
      const result = await res.json()
      setReportData(result.data || [])
    } catch (err: any) {
      alert('Gagal mengambil laporan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // FUNGSI PRINT ASLI LU
  const handlePrintAction = () => {
    const printContents = document.getElementById('printable-receipt')?.innerHTML;
    if (!printContents) return;
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Struk</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { font-family: monospace; padding: 10px; color: black; text-transform: uppercase; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${printContents}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  const totalOmzet = reportData
    .filter(i => i.status !== 'RETURNED')
    .reduce((acc, curr) => acc + Number(curr.total || 0), 0)

  const totalTransaksi = reportData.filter(i => i.status === 'SUCCESS' || !i.status).length
  
  const totalDiskon = reportData
    .filter(i => i.status !== 'RETURNED')
    .reduce((acc, curr) => acc + Number(curr.discount || 0), 0)

  return (
    <div className="bg-white min-h-screen text-black font-sans w-full overflow-x-hidden">
      {/* HEADER SECTION */}
      <div className="p-4 lg:p-10 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="space-y-1">
            <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-black text-[12px] font-bold uppercase mb-2 tracking-widest transition-all">
              <ArrowLeft size={14}/> Dashboard
            </Link>
            <h1 className="text-2xl lg:text-4xl font-bold uppercase tracking-tighter leading-none">Laporan Keuangan</h1>
            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-1">HnM Store • Unit Penjualan</p>
          </div>
          {/* TOMBOL PRINT LAPORAN UTAMA (BALIK LAGI) */}
          <button 
            onClick={() => window.print()} 
            className="w-full lg:w-auto bg-gray-50 text-black border border-gray-100 px-6 py-4 rounded-xl font-bold text-[12px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-3 print:hidden"
          >
            <Printer size={18} /> Cetak Laporan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-gray-50 border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center text-gray-400 font-bold text-[12px] uppercase mb-3 tracking-widest">
              <span>Total Omzet</span><DollarSign size={16}/>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-green-600 tracking-tight">Rp {totalOmzet.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center text-gray-400 font-bold text-[12px] uppercase mb-3 tracking-widest">
              <span>Order Berhasil</span><ShoppingBag size={16}/>
            </div>
            <p className="text-2xl lg:text-3xl font-bold tracking-tight">{totalTransaksi} Order</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-6 lg:p-8 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center text-gray-400 font-bold text-[12px] uppercase mb-3 tracking-widest">
              <span>Total Diskon</span><TrendingUp size={16}/>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-red-500 tracking-tight">Rp {totalDiskon.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 lg:p-10 bg-white border-b border-gray-100 flex flex-col lg:flex-row gap-4 lg:items-end w-full print:hidden">
        <div className="grid grid-cols-2 gap-4 flex-1 lg:max-w-xl">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-gray-400 ml-1 tracking-widest">Dari</label>
            <input type="date" onChange={(e)=>setStartDate(e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl text-[12px] font-bold outline-none text-black border border-gray-100 focus:ring-1 focus:ring-black"/>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-gray-400 ml-1 tracking-widest">Sampai</label>
            <input type="date" onChange={(e)=>setEndDate(e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl text-[12px] font-bold outline-none text-black border border-gray-100 focus:ring-1 focus:ring-black"/>
          </div>
        </div>
        <button onClick={fetchReport} className="bg-black text-white px-10 py-4 rounded-xl font-bold text-[12px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Filter Data</button>
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input type="text" placeholder="CARI PEMBELI..." onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl text-[12px] font-bold outline-none border-none uppercase text-black focus:ring-1 focus:ring-black"/>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white overflow-hidden text-black w-full px-4 lg:px-10 py-8">
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[12px] font-bold uppercase text-gray-400 border-b">
                <tr>
                  <th className="p-6 text-black">ID / Waktu</th>
                  <th className="p-6 text-black">Customer</th>
                  <th className="p-6 text-black">Status</th>
                  <th className="p-6 text-black">Total</th>
                  <th className="p-6 text-right text-black">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[12px] font-bold">
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={32}/></td></tr>
                ) : reportData.filter(i => (i.customer || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-6">
                      <div className="text-black uppercase">#{item.id?.slice(0,8)}</div>
                      <div className="text-[10px] text-gray-400 uppercase mt-1">{new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="p-6 uppercase text-black">{item.customer}</td>
                    <td className="p-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest border ${item.status === 'RETURNED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {item.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td className={`p-6 font-bold text-[14px] ${item.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-black'}`}>
                      Rp {Number(item.total || 0).toLocaleString()}
                    </td>
                    <td className="p-6 text-right">
                      <button onClick={() => setSelectedTransaction(item)} className="text-black hover:bg-black hover:text-white px-4 py-2 border border-gray-100 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase ml-auto transition-all">
                        <Eye size={14}/> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden divide-y divide-gray-50 font-bold">
            {loading ? (
              <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-black" size={32}/></div>
            ) : reportData.filter(i => (i.customer || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
              <div key={item.id} className="p-5 flex justify-between items-center bg-white">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] uppercase text-black truncate">{item.customer}</div>
                  <div className="text-[10px] text-gray-400 uppercase mt-1">#{item.id?.slice(0,8)} • {new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                  <div className="mt-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-widest border ${item.status === 'RETURNED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {item.status || 'SUCCESS'}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-[12px] font-bold ${item.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-black'}`}>
                    Rp {Number(item.total || 0).toLocaleString()}
                  </div>
                  <button onClick={() => setSelectedTransaction(item)} className="text-black bg-gray-50 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase mt-2 border border-gray-100 transition-all">Detail</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL & RECEIPT PRINT BALIK LAGI */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] text-black">
            <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-4">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-black">Detail Pesanan</h2>
              <button onClick={() => setSelectedTransaction(null)} className="p-2 bg-gray-50 rounded-xl text-black transition-all"><X size={20}/></button>
            </div>

            <div id="printable-receipt" className="bg-gray-50 p-6 font-mono text-black border border-gray-200 rounded-2xl leading-tight text-[12px] uppercase">
              <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-5">
                <div className="text-xl font-bold">HnM Store</div>
                <div className="text-[10px] opacity-50 mt-1">#{selectedTransaction.id?.slice(0,10)}</div>
              </div>
              <div className="space-y-1.5 mb-5 font-bold">
                <div className="flex justify-between"><span>Pelanggan:</span><span>{selectedTransaction.customer}</span></div>
                <div className="flex justify-between"><span>Tanggal:</span><span>{new Date(selectedTransaction.created_at).toLocaleDateString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Status:</span><span className={selectedTransaction.status === 'RETURNED' ? 'text-red-600' : 'text-green-600'}>{selectedTransaction.status || 'SUCCESS'}</span></div>
              </div>
              <div className="border-b border-dashed border-gray-300 pb-5 mb-5 space-y-3">
                {(() => {
                  let items = [];
                  try { items = Array.isArray(selectedTransaction.items) ? selectedTransaction.items : JSON.parse(selectedTransaction.items || '[]'); } catch(e) { items = []; }
                  return items.map((item: any, i: number) => (
                    <div key={i} className="space-y-0.5">
                      <div className="flex justify-between font-bold"><span>{item.name}</span><span>x{item.quantity}</span></div>
                      <div className="flex justify-between opacity-50 text-[10px]"><span>SZ {item.size}</span><span>Rp {(Number(item.price) * item.quantity).toLocaleString()}</span></div>
                    </div>
                  ));
                })()}
              </div>
              <div className="space-y-1.5 font-bold">
                <div className="flex justify-between opacity-50"><span>Subtotal:</span><span>Rp {Number(selectedTransaction.subtotal || 0).toLocaleString()}</span></div>
                {Number(selectedTransaction.discount) > 0 && <div className="flex justify-between text-red-600"><span>Diskon:</span><span>-Rp {Number(selectedTransaction.discount).toLocaleString()}</span></div>}
                <div className="flex justify-between text-[14px] pt-3 border-t border-black mt-3"><span>TOTAL:</span><span>Rp {Number(selectedTransaction.total || 0).toLocaleString()}</span></div>
              </div>
            </div>

            <button onClick={handlePrintAction} className="w-full bg-black text-white mt-8 py-5 rounded-2xl font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
              <Printer size={18}/> CETAK ULANG STRUK
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; padding: 20px !important; }
        }
      `}</style>
    </div>
  )
}