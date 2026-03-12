'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, RotateCcw, Eye, ArrowLeft, X, ShoppingBag, User, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import TableCustom from '../components/table'
import ModalRetur from '../components/modalretur'

export default function RiwayatTransaksiPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
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

      const res = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `
            SELECT t.*, COUNT(*) OVER() as full_count 
            FROM public."Transactions" t 
            WHERE t.customer ILIKE $1 OR t.id::text ILIKE $1
            ORDER BY t.created_at DESC 
            LIMIT $2 OFFSET $3`,
          params: [`%${search}%`, pageSize, offset]
        })
      })
      const result = await res.json()
      setData(result.data || [])
      setTotalData(result.data?.[0]?.full_count || 0)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [search, currentPage, pageSize])

  useEffect(() => { fetchRiwayat() }, [fetchRiwayat])

 const handleProcessReturn = async () => {
    if (!selectedTx || !returnReason) return alert('Alasan wajib diisi!');
    setIsReturning(true);
    try {
      let items = typeof selectedTx.items === 'string' ? JSON.parse(selectedTx.items) : selectedTx.items;
      const adminId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

      for (const item of items) {
        // 1. Cek stok terakhir buat log mutasi
        const stRes = await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, params: [item.stockId] })
        });
        const stData = await stRes.json();
        const currentSt = stData.data?.[0]?.stock || 0;

        // 2. Balikin Stok ke Produk
        await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `UPDATE public."ProductSizeStock" SET stock = stock + $1 WHERE id = $2`, params: [item.quantity, item.stockId] })
        });

        // 3. CATAT MUTASI RETUR KE STOCKLOG (BIAR MUNCUL DI HALAMAN MUTASI)
        await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by, created_at) 
                  VALUES ($1, $2, $3, $4, 'RETUR', $5, $6, NOW())`,
            params: [item.name, item.size, currentSt, currentSt + item.quantity, `Retur: ${returnReason}`, adminId]
          })
        });
      }

      // 4. Update Status Transaksi
      await fetch('/api/vps-db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `UPDATE public."Transactions" SET status = 'RETURNED' WHERE id = $1`, params: [selectedTx.id] })
      });

      alert('Retur Berhasil & Mutasi Stok Dicatat!');
      setShowRetur(false);
      fetchRiwayat();
    } catch (err) { alert('Gagal memproses retur'); } finally { setIsReturning(false); }
  }
  const totalPages = Math.ceil(totalData / pageSize)

  return (
    <div className="min-h-screen bg-white p-4 lg:p-10 space-y-6 text-black font-sans pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <Link href="/admin/pos" className="flex items-center gap-2 text-gray-400 hover:text-black transition-all mb-1 font-bold">
            <ArrowLeft size={16} /> <span className="text-xs uppercase">Back to POS</span>
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold uppercase tracking-tighter leading-none text-black">Riwayat Penjualan</h1>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="CARI NAMA / INV..." 
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none border-none shadow-sm" 
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} 
          />
        </div>
      </div>

      {/* TABLE DESKTOP */}
      <div className="hidden lg:block border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
        <TableCustom headers={['Waktu', 'Foto', 'Pelanggan', 'Total', 'Status', 'Aksi']} loading={loading}>
          {data.map((tx) => {
            const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
            return (
              <tr key={tx.id} className="hover:bg-gray-50 transition-all border-b border-gray-50">
                <td className="p-5 text-xs font-bold">
                  {new Date(tx.created_at).toLocaleDateString('id-ID')}<br/>
                  <span className="text-gray-400 font-bold uppercase">{new Date(tx.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </td>
                <td className="p-5">
                  <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                    <Image src={items[0]?.image ? `/api/media/view?bucket=ProductImage&name=${items[0].image}` : '/placeholder.png'} alt="p" fill className="object-cover" unoptimized />
                  </div>
                </td>
                <td className="p-5">
                  <p className="text-xs font-bold uppercase text-black truncate max-w-37">{tx.customer}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase">INV-{tx.id.slice(0,8)}</p>
                </td>
                <td className="p-5 font-bold text-sm text-black">RP {Number(tx.total).toLocaleString()}</td>
                <td className="p-5">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${tx.status === 'RETURNED' ? 'bg-gray-100 text-gray-400 border-gray-200' : tx.payment_status === 'HUTANG' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    {tx.status === 'RETURNED' ? 'RETUR' : tx.payment_status}
                  </span>
                </td>
                <td className="p-5 text-right">
                  <div className="flex gap-2 justify-end">
                    {tx.status !== 'RETURNED' && (
                      <button onClick={() => { setSelectedTx(tx); setShowRetur(true); }} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><RotateCcw size={16} /></button>
                    )}
                    <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }} className="p-3 bg-gray-100 text-black rounded-xl hover:bg-black hover:text-white transition-all"><Eye size={16} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </TableCustom>
      </div>

      {/* MOBILE LIST */}
      <div className="lg:hidden space-y-4">
        {data.map((tx) => {
          const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
          return (
            <div key={tx.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden border border-gray-100 shrink-0">
                    <Image src={items[0]?.image ? `/api/media/view?bucket=ProductImage&name=${items[0].image}` : '/placeholder.png'} alt="p" fill className="object-cover" unoptimized />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-black truncate pr-4">{tx.customer}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase">INV-{tx.id.slice(0,8)}</p>
                    <p className="text-sm font-bold mt-1 text-black">RP {Number(tx.total).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase ${tx.status === 'RETURNED' ? 'bg-gray-100 text-gray-400' : tx.payment_status === 'HUTANG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {tx.status === 'RETURNED' ? 'RETUR' : tx.payment_status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }} className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-black rounded-xl text-xs font-bold uppercase leading-none"><Eye size={16}/> Detail</button>
                {tx.status !== 'RETURNED' && (
                  <button onClick={() => { setSelectedTx(tx); setShowRetur(true); }} className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase leading-none"><RotateCcw size={16}/> Retur</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* --- PAGINATION CONTROL --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <p className="text-xs font-bold uppercase text-gray-400">Total: {totalData} Transaksi</p>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-3 bg-white border border-gray-100 rounded-xl disabled:opacity-30 hover:bg-black hover:text-white transition-all"
          >
            <ChevronLeft size={18}/>
          </button>
          <div className="flex items-center gap-1 px-4">
            <span className="text-xs font-bold text-black uppercase tracking-widest">Page {currentPage} of {totalPages || 1}</span>
          </div>
          <button 
            disabled={currentPage === totalPages || totalPages === 0} 
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-3 bg-white border border-gray-100 rounded-xl disabled:opacity-30 hover:bg-black hover:text-white transition-all"
          >
            <ChevronRight size={18}/>
          </button>
        </div>
      </div>

      {/* MODAL DETAIL */}
      {showDetail && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-black">
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><ShoppingBag size={14}/> Detail Order</h2>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {(() => {
                  let items = typeof selectedTx.items === 'string' ? JSON.parse(selectedTx.items) : selectedTx.items;
                  return items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-3 items-center p-3 border border-gray-100 rounded-xl bg-white shadow-sm">
                      <div className="w-12 h-12 relative rounded-lg overflow-hidden shrink-0 border border-gray-100">
                        <Image src={item.image ? `/api/media/view?bucket=ProductImage&name=${item.image}` : '/placeholder.png'} alt="p" fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0 text-black">
                        <p className="text-xs font-bold uppercase truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">SZ: {item.size} | {item.quantity} Ps</p>
                      </div>
                      <p className="text-xs font-bold text-black">RP {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

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