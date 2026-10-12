'use client'

import { useState, useEffect } from 'react'
import { Search, Wallet, Check, CheckSquare, Square } from 'lucide-react'
import ModalRetur from '@/app/admin/pos/components/modalretur'
import ModalDetailOrder from '@/components/modaldetailorder'
import ContentPiutang, { isPayable, PiutangSummary, PiutangTab } from '@/app/admin/pos/components/ContentPiutang'
import ModalBayarHutang from '@/app/admin/pos/components/ModalBayarHutang'
import EmployeeFilter from '@/app/admin/pos/components/EmployeeFilter'
import DateRangeFilter from '@/app/admin/pos/components/DateRangeFilter'

// POST ke route server; lempar error kalau gagal
async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  let result: any = null
  try { result = await res.json() } catch { /* body bukan JSON */ }
  if (!res.ok || result?.error) throw new Error(result?.error || `HTTP ${res.status}`)
  return result
}

export default function PiutangSellerPage() {
  const [activeTab, setActiveTab] = useState<PiutangTab>('BELUM_LUNAS')

  // Filter: pencarian (debounce 400ms), karyawan, tanggal
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [empId, setEmpId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState<PiutangSummary>({ sisa: 0, pairs: 0, notas: 0, globalSisa: 0 })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const [showDetail, setShowDetail] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [bayarTx, setBayarTx] = useState<any>(null)
  const [showRetur, setShowRetur] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [isReturning, setIsReturning] = useState(false)
  const [returnFile, setReturnFile] = useState<File | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const refresh = () => setRefreshKey((k) => k + 1)

  const isHistory = activeTab === 'RIWAYAT'
  const filterActive = !!(search || empId || from || to)
  const totalTagihanRekap = isHistory ? 0 : summary.sisa

  // Hanya nota yang masih bisa dibayar yang boleh dicentang
  const payableRows = data.filter(isPayable)
  const isAllSelected = payableRows.length > 0 && payableRows.every((item) => selectedIds.includes(item.id))

  const handleSelectAll = () => {
    const pageIds = payableRows.map((d) => d.id)
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => [...prev, ...pageIds.filter((id) => !prev.includes(id))])
    }
  }

  // Lunaskan sisa semua nota terpilih (penerima dicatat server dari token)
  const handleBulkLunas = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Lunaskan sisa ${selectedIds.length} transaksi terpilih?`)) return
    try {
      const result = await postJson('/api/admin/hutang/bayar', { ids: selectedIds })
      if (result.skipped > 0) alert(`${result.updated} nota dilunasi, ${result.skipped} dilewati (sudah lunas / diretur).`)
      setSelectedIds([])
      refresh()
    } catch (err: any) {
      alert(`Gagal Bulk Lunas: ${err.message}`)
    }
  }

  // Retur atomik di server: stok + log + status dalam satu transaksi database
  const handleProcessReturn = async () => {
    if (!selectedTx || !returnReason.trim()) return alert('Alasan wajib diisi!')
    setIsReturning(true)
    try {
      await postJson('/api/admin/retur', { id: selectedTx.id, reason: returnReason.trim() })
      alert('Retur Berhasil!')
      setShowRetur(false)
      setReturnReason('')
      setReturnFile(null)
      refresh()
    } catch (err: any) {
      console.error(err)
      alert(`Gagal memproses retur: ${err.message}`)
    } finally {
      setIsReturning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          placeholder="CARI NAMA SELLER ATAU INV..." 
          value={searchInput}
          className="w-full pl-11 pr-4 py-4 bg-gray-50  rounded text-xs font-bold uppercase outline-none shadow-sm border border-transparent focus:border-black transition-all" 
          onChange={(e) => setSearchInput(e.target.value)} 
        />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <EmployeeFilter value={empId} onChange={(id: any) => setEmpId(id || '')} />
        <DateRangeFilter from={from} to={to} onChange={(f: string, t: string) => { setFrom(f || ''); setTo(t || '') }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold">
        <div className={`p-6  rounded border flex flex-col justify-between transition-all duration-300 ${filterActive && !isHistory ? 'bg-black text-white border-black shadow-xl' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">Filter Tagihan (Sisa)</p>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tighter leading-none">RP {totalTagihanRekap.toLocaleString()}</h2>
          </div>
          <div className="mt-4 flex gap-6 items-center border-t border-gray-100/20 pt-4 opacity-70">
            <div><p className="text-[10px] uppercase mb-1 leading-none">Psg</p><p className="text-sm font-bold">{summary.pairs}</p></div>
            <div><p className="text-[10px] uppercase mb-1 leading-none">Nota</p><p className="text-sm font-bold">{summary.notas}</p></div>
          </div>
        </div>
        <div className="bg-zinc-900 p-6  rounded shadow-xl flex flex-col justify-between font-bold border border-zinc-800 text-white">
          <div className="flex items-start justify-between">
            <div><p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-1 leading-none text-zinc-400">Total Global</p><h3 className="text-lg font-bold uppercase">Piutang</h3></div>
            <div className="p-3 bg-white/10  rounded"><Wallet size={20}/></div>
          </div>
          <div className="mt-4 text-white"><p className="text-2xl lg:text-3xl font-bold tracking-tighter">RP {summary.globalSisa.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-gray-50  rounded w-full lg:w-fit border border-gray-100 font-bold">
          {(['BELUM_LUNAS', 'JATUH_TEMPO', 'RIWAYAT'] as PiutangTab[]).map((tab) => (
            <button 
              key={tab} 
              onClick={() => { setActiveTab(tab); setSelectedIds([]) }} 
              className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded text-[10px] font-bold uppercase transition-all ${activeTab === tab ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button 
          onClick={handleSelectAll}
          disabled={payableRows.length === 0}
          className={`flex items-center gap-3 px-6 py-3  rounded border transition-all font-bold uppercase text-[10px] tracking-widest disabled:opacity-30 ${isAllSelected ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
        >
          {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          {isAllSelected ? 'Batal Semua' : 'Centang Halaman Ini'}
        </button>
      </div>

      <ContentPiutang 
        key={activeTab}
        type={activeTab}
        search={search}
        empId={empId}
        from={from}
        to={to}
        refreshKey={refreshKey}
        onDataUpdate={setData}
        onSummary={setSummary}
        onActionDetail={(tx: any) => { setSelectedTx(tx); setShowDetail(true) }}
        onActionRetur={(tx: any) => { setSelectedTx(tx); setShowRetur(true) }}
        onActionBayar={(tx: any) => setBayarTx(tx)}
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
      <ModalBayarHutang
        show={!!bayarTx}
        tx={bayarTx}
        onClose={() => setBayarTx(null)}
        onDone={() => { setBayarTx(null); refresh() }}
      />
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