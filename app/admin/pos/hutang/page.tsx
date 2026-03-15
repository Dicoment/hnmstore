'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, MessageCircle, ArrowLeft, Eye, Check, RotateCcw, Loader2, X, ShoppingBag, User, Smartphone, Wallet, CheckSquare, Square, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import TableCustom from '../components/table'
import ModalRetur from '../components/modalretur'
import ModalDetailOrder from '@/components/modaldetailorder'

export default function PiutangSellerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'BELUM_LUNAS' | 'JATUH_TEMPO' | 'RIWAYAT'>('BELUM_LUNAS')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [showDetail, setShowDetail] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [showRetur, setShowRetur] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [isReturning, setIsReturning] = useState(false)
  const [returnFile, setReturnFile] = useState<File | null>(null)

  // FUNGSI WHATSAPP (GUE BALIKIN LAGI TRI, MAAF GOBLOK)
  const sendWhatsApp = (customer: string, total: number, dueDate: string, whatsapp: string) => {
    const tgl = dueDate ? new Date(dueDate).toLocaleDateString('id-ID') : 'segera'
    const targetPhone = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : ''
    if (!targetPhone) return alert("Nomor WA tidak ditemukan!");
    const msg = `Halo kak ${customer}, admin HnM Store mengingatkan tagihan Rp ${Number(total).toLocaleString()} jatuh tempo ${tgl}. Mohon segera dilunasi ya kak. Trims!`
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const fetchPiutang = useCallback(async () => {
    try {
      setLoading(true)
      setSelectedIds([])
      let statusQuery = ""
      
      if (activeTab === 'BELUM_LUNAS') {
        statusQuery = "AND t.payment_status = 'HUTANG' AND t.status = 'SUCCESS'"
      } else if (activeTab === 'JATUH_TEMPO') {
        statusQuery = "AND t.payment_status = 'HUTANG' AND t.due_date < CURRENT_DATE AND t.status = 'SUCCESS'"
      } else if (activeTab === 'RIWAYAT') {
        statusQuery = "AND t.payment_method = 'HUTANG' AND (t.payment_status = 'LUNAS' OR t.status = 'RETURNED')"
      }

      const sql = `
        SELECT t.*, 
        (
          SELECT images FROM public."Product" 
          WHERE name = (
            SELECT (value->>'name')::text 
            FROM jsonb_array_elements(t.items::jsonb) 
            LIMIT 1
          )
          LIMIT 1
        ) as product_images
        FROM public."Transactions" t 
        WHERE (t.customer ILIKE $1 OR t.id::text ILIKE $1) ${statusQuery} 
        ORDER BY t.created_at DESC
      `

      const res = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          params: [`%${search}%`]
        })
      })
      const result = await res.json()
      setData(result.data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [activeTab, search])

  useEffect(() => { fetchPiutang() }, [fetchPiutang])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleBulkLunas = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Lunaskan ${selectedIds.length} transaksi terpilih?`)) return;
    setLoading(true)
    try {
      await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: `UPDATE public."Transactions" SET payment_status = 'LUNAS' WHERE id IN (${selectedIds.map((_, i) => `$${i + 1}`).join(',')})`, 
          params: selectedIds 
        })
      })
      fetchPiutang()
    } catch (err) { alert("Gagal Bulk Lunas") } finally { setLoading(false) }
  }

  const handleProcessReturn = async () => {
    if (!selectedTx || !returnReason) return alert('Alasan wajib diisi!');
    setIsReturning(true);
    try {
      let items = typeof selectedTx.items === 'string' ? JSON.parse(selectedTx.items) : selectedTx.items;
      const adminId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

      for (const item of items) {
        const oldStockRes = await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, params: [item.stockId] })
        });
        const oldStockData = await oldStockRes.json();
        const currentStock = oldStockData.data?.[0]?.stock || 0;

        await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `UPDATE public."ProductSizeStock" SET stock = stock + $1 WHERE id = $2`, params: [item.quantity, item.stockId] })
        });

        await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by, created_at) VALUES ($1, $2, $3, $4, 'RETUR', $5, $6, NOW())`,
            params: [item.name, item.size, currentStock, currentStock + item.quantity, `Retur Seller: ${returnReason}`, adminId]
          })
        });
      }

      await fetch('/api/vps-db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `UPDATE public."Transactions" SET status = 'RETURNED' WHERE id = $1`, params: [selectedTx.id] })
      });

      alert('Retur Berhasil!');
      setShowRetur(false);
      fetchPiutang();
    } catch (err) { alert('Gagal memproses retur'); } finally { setIsReturning(false); }
  }

  const isHistory = activeTab === 'RIWAYAT'
  const totalBarangRekap = isHistory ? 0 : data.reduce((acc, curr) => acc + (curr.items_count || 0), 0)
  const totalTagihanRekap = isHistory ? 0 : data.reduce((acc, curr) => acc + Number(curr.total || 0), 0)
  const totalGlobalHutang = useMemo(() => isHistory ? 0 : data.reduce((acc, curr) => acc + Number(curr.total || 0), 0), [data, isHistory])

  const handleSetLunas = async (tx: any) => {
    if (!confirm(`Konfirmasi pelunasan untuk ${tx.customer}?`)) return;
    try {
      await fetch('/api/vps-db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `UPDATE public."Transactions" SET payment_status = 'LUNAS' WHERE id = $1`, params: [tx.id] })
      })
      fetchPiutang()
    } catch (err) { alert("Gagal") }
  }

  return (
    <div className="min-h-screen bg-white p-3 lg:p-10 space-y-5 text-black font-sans pb-32 lg:pb-20 overflow-x-hidden relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4 font-bold">
        <div className="space-y-1">
          <button onClick={() => router.push('/admin/pos')} className="flex items-center gap-2 text-gray-400 hover:text-black transition-all mb-1 font-bold">
            <ArrowLeft size={14} /> <span className="text-xs uppercase font-bold">Back</span>
          </button>
          <h1 className="text-xl lg:text-3xl font-bold uppercase tracking-tighter leading-none">Piutang Seller</h1>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="CARI SELLER..." className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none shadow-sm" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold">
        <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${search && !isHistory ? 'bg-black text-white border-black shadow-lg' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">{search ? `Rekap: ${search}` : 'Tagihan Aktif'}</p>
            <h2 className="text-xl lg:text-4xl font-bold tracking-tighter leading-none">RP {totalTagihanRekap.toLocaleString()}</h2>
          </div>
          <div className="mt-4 flex gap-6 items-center border-t border-gray-100 pt-4 opacity-70 font-bold">
            <div><p className="text-[10px] font-bold uppercase mb-1 leading-none text-black">Psg</p><p className="text-sm font-bold text-black">{totalBarangRekap}</p></div>
            <div><p className="text-[10px] font-bold uppercase mb-1 leading-none text-black">Nota</p><p className="text-sm font-bold text-black">{isHistory ? 0 : data.length}</p></div>
          </div>
        </div>
        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between font-bold">
          <div className="flex items-start justify-between">
            <div><p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-1 leading-none">Global</p><h3 className="text-lg font-bold uppercase">Total Piutang</h3></div>
            <div className="p-2 bg-white/10 rounded-xl"><Wallet size={20}/></div>
          </div>
          <div className="mt-4"><p className="text-2xl lg:text-3xl font-bold tracking-tighter">RP {totalGlobalHutang.toLocaleString()}</p></div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-gray-50 rounded-xl w-full lg:w-fit border border-gray-100 font-bold">
        {['BELUM_LUNAS', 'JATUH_TEMPO', 'RIWAYAT'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>{tab.replace('_', ' ')}</button>
        ))}
      </div>

      {/* TABLE DESKTOP */}
      <div className="hidden lg:block border border-gray-100 rounded-3xl overflow-hidden shadow-sm bg-white font-bold">
        <TableCustom headers={['Sel', 'Foto', 'Seller', 'Total', 'Tgl', 'Tempo', 'Aksi']} loading={loading}>
          {data.map((tx) => {
             const isSelected = selectedIds.includes(tx.id);
             return (
              <tr key={tx.id} className={`hover:bg-gray-50 border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                <td className="p-4">
                  <button onClick={() => toggleSelect(tx.id)} className={`${isSelected ? 'text-black' : 'text-gray-300'}`}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </td>
                <td className="p-4">
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    {tx.product_images?.[0] ? (
                      <Image src={`/uploads/${tx.product_images[0]}`} alt="p" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={20} /></div>
                    )}
                  </div>
                </td>
                <td className="p-4"><p className="text-xs font-bold uppercase text-black leading-none mb-1">{tx.customer}</p><p className="text-[10px] text-gray-400 font-bold">INV-{tx.id.toString().slice(0,8)}</p></td>
                <td className={`p-4 font-bold text-xs ${tx.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-red-600'}`}>RP {Number(tx.total).toLocaleString()}</td>
                <td className="p-4 text-xs font-bold uppercase">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                <td className={`p-4 text-xs font-bold uppercase ${new Date(tx.due_date) < new Date() && tx.payment_status === 'HUTANG' ? 'text-red-600' : 'text-black'}`}>
                  {tx.due_date ? new Date(tx.due_date).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-end">
                    {tx.payment_status === 'HUTANG' && tx.status !== 'RETURNED' && (
                      <><button onClick={() => handleSetLunas(tx)} className="p-3 bg-black text-white rounded-xl shadow-sm"><Check size={16} /></button>
                        <button onClick={() => { setSelectedTx(tx); setShowRetur(true); }} className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100"><RotateCcw size={16} /></button>
                        <button onClick={() => sendWhatsApp(tx.customer, tx.total, tx.due_date, tx.whatsapp)} className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100"><MessageCircle size={16} /></button></>
                    )}
                    <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }} className="p-3 bg-gray-50 text-black rounded-xl border border-gray-100 shadow-sm"><Eye size={16} /></button>
                  </div>
                </td>
              </tr>
             )
          })}
        </TableCustom>
      </div>

      {/* VIEW MOBILE */}
      <div className="lg:hidden space-y-4 font-bold">
        {data.map((tx) => {
          const isSelected = selectedIds.includes(tx.id);
          return (
            <div key={tx.id} className={`bg-white border rounded-3xl p-5 shadow-sm transition-all font-bold ${isSelected ? 'border-black ring-1 ring-black' : 'border-gray-100'}`}>
              <div className="flex gap-4 items-center mb-4 font-bold">
                <button onClick={() => toggleSelect(tx.id)} className={`${isSelected ? 'text-black' : 'text-gray-300'} shrink-0`}>
                  {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>
                <div className="w-16 h-16 relative rounded-2xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                  {tx.product_images?.[0] ? (
                    <Image src={`/uploads/${tx.product_images[0]}`} alt="p" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={18} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 font-bold">
                  <p className="text-xs font-bold uppercase truncate leading-none mb-2 text-black">{tx.customer}</p>
                  <p className={`text-sm font-bold ${tx.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-red-600'}`}>RP {Number(tx.total).toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-50 font-bold">
                {tx.payment_status === 'HUTANG' && tx.status !== 'RETURNED' && (
                  <><button onClick={() => handleSetLunas(tx)} className="flex items-center justify-center py-4 bg-black text-white rounded-xl"><Check size={18}/></button>
                    <button onClick={() => { setSelectedTx(tx); setShowRetur(true); }} className="flex items-center justify-center py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl"><RotateCcw size={18}/></button>
                    <button onClick={() => sendWhatsApp(tx.customer, tx.total, tx.due_date, tx.whatsapp)} className="flex items-center justify-center py-4 bg-green-50 text-green-600 border border-green-100 rounded-xl"><MessageCircle size={18}/></button></>
                )}
                <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }} className={`flex items-center justify-center py-4 bg-gray-50 text-black border border-gray-100 rounded-3xl ${tx.payment_status === 'LUNAS' || tx.status === 'RETURNED' ? 'col-span-4' : 'col-span-1'}`}><Eye size={18}/></button>
              </div>
            </div>
          )
        })}
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] lg:w-fit bg-black text-white p-5 rounded-3xl shadow-2xl z-50 flex items-center justify-between gap-10 font-bold animate-in slide-in-from-bottom-5">
          <div><p className="text-[10px] uppercase opacity-50 tracking-widest mb-1">Terpilih</p><p className="text-sm uppercase font-bold">{selectedIds.length} Nota</p></div>
          <div className="flex gap-3">
            <button onClick={() => setSelectedIds([])} className="px-5 py-3 bg-white/10 rounded-xl text-xs  uppercase font-bold">Batal</button>
            <button onClick={handleBulkLunas} className="px-8 py-3 bg-white text-black rounded-xl text-xs uppercase flex items-center gap-2 font-bold"><Check size={16}/> Lunaskan</button>
          </div>
        </div>
      )}

      {/* MODAL DETAIL ORDER */}
      <ModalDetailOrder show={showDetail} onClose={() => setShowDetail(false)} selectedTx={selectedTx} />

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