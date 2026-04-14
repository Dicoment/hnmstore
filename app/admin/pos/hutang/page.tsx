'use client'

import { useState, useMemo } from 'react'
import { Search, Wallet, Check, CheckSquare, Square } from 'lucide-react'
import ModalRetur from '@/app/admin/pos/components/modalretur'
import ModalDetailOrder from '@/components/modaldetailorder'
import ContentPiutang from '@/app/admin/pos/components/ContentPiutang'

export default function PiutangSellerPage() {
  const [activeTab, setActiveTab] = useState<'BELUM_LUNAS' | 'JATUH_TEMPO' | 'RIWAYAT'>('BELUM_LUNAS')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [showDetail, setShowDetail] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [showRetur, setShowRetur] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [isReturning, setIsReturning] = useState(false)
  const [returnFile, setReturnFile] = useState<File | null>(null)

  const isHistory = activeTab === 'RIWAYAT'
  const totalTagihanRekap = isHistory ? 0 : data.reduce((acc, curr) => acc + Number(curr.total || 0), 0)
  const totalGlobalHutang = useMemo(() => isHistory ? 0 : data.reduce((acc, curr) => acc + Number(curr.total || 0), 0), [data, isHistory])

  const isAllSelected = data.length > 0 && data.every(item => selectedIds.includes(item.id))

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !data.map(d => d.id).includes(id)))
    } else {
      const newIds = data.map(d => d.id).filter(id => !selectedIds.includes(id))
      setSelectedIds(prev => [...prev, ...newIds])
    }
  }

  const handleBulkLunas = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Lunaskan ${selectedIds.length} transaksi terpilih?`)) return;
    try {
      await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: `UPDATE public."Transactions" SET payment_status = 'LUNAS' WHERE id IN (${selectedIds.map((_, i) => `$${i + 1}`).join(',')})`, 
          params: selectedIds 
        })
      })
      window.location.reload()
    } catch (err) { alert("Gagal Bulk Lunas") }
  }

  // --- FUNGSI RETUR GUE BALIKIN (JANGAN DIAPUS LAGI) ---
  const handleProcessReturn = async () => {
    if (!selectedTx || !returnReason) return alert('Alasan wajib diisi!');
    setIsReturning(true);
    try {
      let items = typeof selectedTx.items === 'string' ? JSON.parse(selectedTx.items) : selectedTx.items;
      const adminId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

      for (const item of items) {
        // 1. Ambil stok lama
        const oldStockRes = await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, params: [item.stockId] })
        });
        const oldStockData = await oldStockRes.json();
        const currentStock = oldStockData.data?.[0]?.stock || 0;

        // 2. Tambah stok (Barang balik ke gudang)
        await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `UPDATE public."ProductSizeStock" SET stock = stock + $1 WHERE id = $2`, params: [item.quantity, item.stockId] })
        });

        // 3. Catat Log Mutasi
        await fetch('/api/vps-db', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by, created_at) VALUES ($1, $2, $3, $4, 'RETUR', $5, $6, NOW())`,
            params: [item.name, item.size, currentStock, currentStock + item.quantity, `Retur Seller: ${returnReason}`, adminId]
          })
        });
      }

      // 4. Update status transaksi jadi RETURNED
      await fetch('/api/vps-db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `UPDATE public."Transactions" SET status = 'RETURNED' WHERE id = $1`, params: [selectedTx.id] })
      });

      alert('Retur Berhasil!');
      setShowRetur(false);
      window.location.reload();
    } catch (err) { 
      console.error(err);
      alert('Gagal memproses retur'); 
    } finally { 
      setIsReturning(false); 
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          placeholder="CARI NAMA SELLER ATAU INV..." 
          className="w-full pl-11 pr-4 py-4 bg-gray-50  rounded text-xs font-bold uppercase outline-none shadow-sm border border-transparent focus:border-black transition-all" 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold">
        <div className={`p-6  rounded border flex flex-col justify-between transition-all duration-300 ${search && !isHistory ? 'bg-black text-white border-black shadow-xl' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">Filter Tagihan</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tighter leading-none">RP {totalTagihanRekap.toLocaleString()}</h2>
          </div>
          <div className="mt-4 flex gap-6 items-center border-t border-gray-100/20 pt-4 opacity-70">
            <div><p className="text-[10px] uppercase mb-1 leading-none">Psg</p><p className="text-sm font-bold">{data.reduce((acc, curr) => acc + (curr.items_count || 0), 0)}</p></div>
            <div><p className="text-[10px] uppercase mb-1 leading-none">Nota</p><p className="text-sm font-bold">{data.length}</p></div>
          </div>
        </div>
        <div className="bg-zinc-900 p-6  rounded shadow-xl flex flex-col justify-between font-bold border border-zinc-800 text-white">
          <div className="flex items-start justify-between">
            <div><p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-1 leading-none text-zinc-400">Total Global</p><h3 className="text-lg font-bold uppercase">Piutang</h3></div>
            <div className="p-3 bg-white/10  rounded"><Wallet size={20}/></div>
          </div>
          <div className="mt-4 text-white"><p className="text-2xl lg:text-3xl font-bold tracking-tighter">RP {totalGlobalHutang.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-gray-50  rounded w-full lg:w-fit border border-gray-100 font-bold">
          {['BELUM_LUNAS', 'JATUH_TEMPO', 'RIWAYAT'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => { setActiveTab(tab as any); setSelectedIds([]) }} 
              className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded text-[10px] font-bold uppercase transition-all ${activeTab === tab ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button 
          onClick={handleSelectAll}
          className={`flex items-center gap-3 px-6 py-3  rounded border transition-all font-bold uppercase text-[10px] tracking-widest ${isAllSelected ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
        >
          {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          {isAllSelected ? 'Batal Semua' : 'Centang Halaman Ini'}
        </button>
      </div>

      <ContentPiutang 
        key={activeTab}
        type={activeTab}
        search={search}
        onDataUpdate={setData}
        onActionDetail={(tx: any) => { setSelectedTx(tx); setShowDetail(true); }}
        onActionRetur={(tx: any) => { setSelectedTx(tx); setShowRetur(true); }}
        selectedIds={selectedIds}
        onToggleSelect={(id: any) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
      />

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] lg:w-fit bg-black text-white p-5  rounded shadow-2xl z-50 flex items-center justify-between gap-10 font-bold">
          <div><p className="text-[10px] uppercase opacity-50">Terpilih</p><p className="text-sm uppercase font-bold">{selectedIds.length} Nota</p></div>
          <div className="flex gap-3">
            <button onClick={() => setSelectedIds([])} className="px-5 py-3 bg-white/10  rounded text-[10px] uppercase font-bold">Batal</button>
            <button onClick={handleBulkLunas} className="px-8 py-3 bg-white text-black  rounded text-[10px] uppercase flex items-center gap-2 font-bold"><Check size={16}/> Lunaskan</button>
          </div>
        </div>
      )}

      <ModalDetailOrder show={showDetail} onClose={() => setShowDetail(false)} selectedTx={selectedTx} />
      <ModalRetur 
        show={showRetur} 
        onClose={() => setShowRetur(false)} 
        selectedTx={selectedTx} 
        returnReason={returnReason} 
        setReturnReason={setReturnReason} 
        isReturning={isReturning} 
        handleProcessReturn={handleProcessReturn} 
        returnFile={returnFile} 
        setReturnFile={setReturnFile} 
      />
    </div>
  )
}