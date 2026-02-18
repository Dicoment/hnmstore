'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Download, Filter, Search, RotateCcw, 
  FileSpreadsheet, ArrowLeft, DollarSign, ShoppingBag, TrendingUp,
  Eye, Printer, X, Camera
} from 'lucide-react'
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

  async function fetchReport() {
    setLoading(true)
    try {
      let query = supabase.from('Transactions').select('*').order('created_at', { ascending: false })
      if (startDate && endDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`)
      }
      const { data, error } = await query
      if (error) throw error
      setReportData(data || [])
    } catch (err: any) {
      alert('Gagal mengambil data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrintAction = () => {
    const printContents = document.getElementById('printable-receipt')?.innerHTML;
    if (!printContents) return;
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Struk</title><style>@page { margin: 0; } body { font-family: 'Courier New', monospace; padding: 10mm; width: 72mm; margin: auto; color: black; } .flex { display: flex; justify-content: space-between; } .border-b { border-bottom: 1px dashed #000; margin: 10px 0; }</style></head><body>${printContents}<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script></body></html>`);
      printWindow.document.close();
    }
  }

  // LOGIKA OMZET BENAR: Hanya hitung yang statusnya bukan RETURNED
  const totalOmzet = reportData
    .filter(i => i.status !== 'RETURNED')
    .reduce((acc, curr) => acc + (curr.total || 0), 0)

  const totalTransaksi = reportData.filter(i => i.status === 'SUCCESS' || !i.status).length
  
  const totalDiskon = reportData
    .filter(i => i.status !== 'RETURNED')
    .reduce((acc, curr) => acc + (curr.discount || 0), 0)

  return (
    <div className="rounded-xl bg-white min-h-screen text-black font-sans relative">
      
      <div className="w-fullborderoverflow-hidden">
        
        <div className="p-6 md:p-8 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="space-y-1">
              <Link href="/admin/" className="flex items-center gap-2 text-gray-400 hover:text-black text-[10px] font-black uppercase transition-all mb-2">
                <ArrowLeft size={14}/> Kembali ke Dashboard
              </Link>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">Laporan Keuangan</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">HnM Store • Unit Penjualan</p>
            </div>
            <button className="bg-[#1D6F42] text-white px-6 py-4 rounded-2xl font-black text-[12px] uppercase flex items-center gap-2 shadow-lg hover:bg-opacity-90 transition-all">
              <FileSpreadsheet size={18} /> Download Excel (CSV)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-center text-gray-400 font-bold text-[11px] uppercase mb-2">
                <span>Total Omzet</span><DollarSign size={14}/>
              </div>
              <p className="text-2xl font-black italic text-green-600">Rp {totalOmzet.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-center text-gray-400 font-bold text-[11px] uppercase mb-2">
                <span>Order Berhasil</span><ShoppingBag size={14}/>
              </div>
              <p className="text-2xl font-black italic">{totalTransaksi} Order</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-center text-gray-400 font-bold text-[11px] uppercase mb-2">
                <span>Total Diskon</span><TrendingUp size={14}/>
              </div>
              <p className="text-2xl font-black italic text-red-500">Rp {totalDiskon.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-b border-gray-50 flex flex-wrap gap-4 items-end">
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Dari</label><input type="date" onChange={(e)=>setStartDate(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"/></div>
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Sampai</label><input type="date" onChange={(e)=>setEndDate(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"/></div>
          <button onClick={fetchReport} className="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Filter</button>
          <div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14}/><input type="text" placeholder="CARI PEMBELI..." onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-xs font-bold outline-none border-none uppercase"/></div>
        </div>

        <div className="bg-white overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
              <tr><th className="p-5">ID / Waktu</th><th className="p-5">Customer</th><th className="p-5">Status</th><th className="p-5">Total</th><th className="p-5 text-right">Aksi</th></tr>
            </thead>
            <tbody className="text-[11px] font-bold">
              {reportData.filter(i => i.customer.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-5"><div>#{item.id.slice(0,8).toUpperCase()}</div><div className="text-[10px] text-gray-400 uppercase">{new Date(item.created_at).toLocaleDateString('id-ID')}</div></td>
                  <td className="p-5 uppercase tracking-tighter">{item.customer}</td>
                  <td className="p-5"><span className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest ${item.status === 'RETURNED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item.status || 'SUCCESS'}</span></td>
                  <td className={`p-5 font-black italic text-sm ${item.status === 'RETURNED' ? 'text-gray-300 line-through' : ''}`}>Rp {item.total?.toLocaleString()}</td>
                  <td className="p-5 text-right">
                    <button onClick={() => setSelectedTransaction(item)} className="text-gray-400 hover:text-black flex items-center gap-1 text-[10px] font-black uppercase ml-auto transition-all"><Eye size={14}/> Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[11px] font-black uppercase italic tracking-widest">Detail Pesanan</h2>
              <button onClick={() => setSelectedTransaction(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20}/></button>
            </div>

            <div id="printable-receipt" className="bg-gray-50 p-6 font-mono text-black border-2 border-dashed border-gray-100 rounded-xl leading-tight">
              <div className="text-center border-b pb-4 mb-4">
                <div className="text-lg font-black italic uppercase">HnM Store</div>
                <div className="text-[10px] font-bold">Jepara - Indonesia</div>
                <div className="text-[10px] text-gray-400 mt-1">#{selectedTransaction.id.slice(0,10)}</div>
              </div>
              <div className="space-y-1 text-[10px] uppercase font-bold mb-4">
                <div className="flex justify-between"><span>Pelanggan:</span><span>{selectedTransaction.customer}</span></div>
                <div className="flex justify-between"><span>Tanggal:</span><span>{new Date(selectedTransaction.created_at).toLocaleDateString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Status:</span><span>{selectedTransaction.status || 'SUCCESS'}</span></div>
              </div>
              <div className="border-b pb-4 mb-4 space-y-2">
                {selectedTransaction.items?.map((item: any, i: number) => (
                  <div key={i} className="text-[10px] uppercase">
                    <div className="flex justify-between font-bold"><span>{item.name}</span><span>x{item.quantity}</span></div>
                    <div className="flex justify-between text-gray-400 text-[10px]"><span>Size {item.size}</span><span>Rp {(item.price * item.quantity).toLocaleString()}</span></div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-[10px] font-black uppercase">
                <div className="flex justify-between text-gray-400"><span>Subtotal:</span><span>Rp {selectedTransaction.subtotal?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm pt-2 border-t mt-2 font-black italic"><span>TOTAL:</span><span>Rp {selectedTransaction.total.toLocaleString()}</span></div>
              </div>
            </div>

            {selectedTransaction.status === 'RETURNED' && (
              <div className="mt-4 space-y-2 border-t pt-4">
                <p className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><Camera size={14}/> Bukti Retur</p>
                <div className="rounded-xl overflow-hidden border border-gray-100 aspect-video relative bg-gray-50">
                  {selectedTransaction.return_proof_url ? (
                    <img src={selectedTransaction.return_proof_url} alt="Bukti" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[10px] text-gray-400 font-bold italic">FOTO TIDAK ADA</div>
                  )}
                </div>
                {selectedTransaction.return_reason && (
                  <p className="text-[10px] font-bold text-red-500 uppercase bg-red-50 p-2 rounded-lg italic">"{selectedTransaction.return_reason}"</p>
                )}
              </div>
            )}

            <button onClick={handlePrintAction} className="w-full bg-black text-white mt-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
              <Printer size={16}/> CETAK ULANG STRUK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}