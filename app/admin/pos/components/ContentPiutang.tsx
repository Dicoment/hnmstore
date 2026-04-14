'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Eye, Check, RotateCcw, CheckSquare, Square, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import TableCustom from './table'

interface ContentPiutangProps {
  type: 'BELUM_LUNAS' | 'JATUH_TEMPO' | 'RIWAYAT'
  search: string
  onDataUpdate: (data: any[]) => void
  onActionDetail: (tx: any) => void
  onActionRetur: (tx: any) => void
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}

export default function ContentPiutang({ 
  type, search, onDataUpdate, onActionDetail, onActionRetur, selectedIds, onToggleSelect 
}: ContentPiutangProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const limit = 10 

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
      let statusQuery = ""
      if (type === 'BELUM_LUNAS') {
        statusQuery = "AND t.payment_status = 'HUTANG' AND t.status = 'SUCCESS'"
      } else if (type === 'JATUH_TEMPO') {
        statusQuery = "AND t.payment_status = 'HUTANG' AND t.due_date < CURRENT_DATE AND t.status = 'SUCCESS'"
      } else if (type === 'RIWAYAT') {
        statusQuery = "AND t.payment_method = 'HUTANG' AND (t.payment_status = 'LUNAS' OR t.status = 'RETURNED')"
      }

      const offset = (page - 1) * limit

      // FIX QUERY: Ambil image dari JSON items agar SINKRON dengan modal detail
      const sql = `
        SELECT t.*, 
        (
          SELECT (value->>'image')::text 
          FROM jsonb_array_elements(t.items::jsonb) 
          LIMIT 1
        ) as featured_image,
        COUNT(*) OVER() as full_count
        FROM public."Transactions" t 
        WHERE (t.customer ILIKE $1 OR t.id::text ILIKE $1) ${statusQuery} 
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      const res = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params: [`%${search}%`] })
      })
      const result = await res.json()
      const fetchedData = result.data || []
      
      setData(fetchedData)
      setTotalData(fetchedData[0]?.full_count || 0)
      
      // Kirim data ke parent untuk kalkulasi totalan dashboard
      onDataUpdate(fetchedData)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [type, search, page, onDataUpdate])

  useEffect(() => { fetchPiutang() }, [fetchPiutang])

  useEffect(() => { setPage(1) }, [search, type])

  const handleSetLunas = async (tx: any) => {
    if (!confirm(`Konfirmasi pelunasan untuk ${tx.customer}?`)) return;
    try {
      await fetch('/api/vps-db', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `UPDATE public."Transactions" SET payment_status = 'LUNAS' WHERE id = $1`, params: [tx.id] })
      })
      fetchPiutang()
    } catch (err) { alert("Gagal") }
  }

  const totalPages = Math.ceil(totalData / limit)

  return (
    <div className="space-y-6">
      {/* TABLE DESKTOP */}
      <div className="hidden lg:block border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white font-bold">
        <TableCustom headers={['Sel', 'Foto', 'Seller', 'Total', 'Tgl', 'Tempo', 'Aksi']} loading={loading}>
          {data.map((tx) => {
            const isSelected = selectedIds.includes(tx.id);
            return (
              <tr key={tx.id} className={`hover:bg-gray-50 border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                <td className="p-4">
                  <button onClick={() => onToggleSelect(tx.id)} className={`${isSelected ? 'text-black' : 'text-gray-300'}`}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </td>
                <td className="p-4">
                  <div className="w-14 h-14 relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                    {tx.featured_image ? (
                      <Image src={`/uploads/${tx.featured_image}`} alt="produk" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={20} /></div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-xs font-bold uppercase text-black leading-none mb-1">{tx.customer}</p>
                  <p className="text-[10px] text-gray-400 font-bold tracking-tight">INV-{tx.id.toString().slice(0,8)}</p>
                </td>
                <td className={`p-4 font-bold text-xs ${tx.status === 'RETURNED' ? 'text-gray-300 line-through' : 'text-red-600'}`}>RP {Number(tx.total).toLocaleString()}</td>
                <td className="p-4 text-xs font-bold uppercase">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                <td className={`p-4 text-xs font-bold uppercase ${new Date(tx.due_date) < new Date() && tx.payment_status === 'HUTANG' ? 'text-red-600' : 'text-black'}`}>
                  {tx.due_date ? new Date(tx.due_date).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    {tx.payment_status === 'HUTANG' && tx.status !== 'RETURNED' && (
                      <><button onClick={() => handleSetLunas(tx)} className="p-3 bg-black text-white rounded-lg shadow-sm active:scale-95 transition-all"><Check size={16} /></button>
                        <button onClick={() => onActionRetur(tx)} className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 active:scale-95 transition-all"><RotateCcw size={16} /></button>
                        <button onClick={() => sendWhatsApp(tx.customer, tx.total, tx.due_date, tx.whatsapp)} className="p-3 bg-green-50 text-green-600 rounded-lg border border-green-100 active:scale-95 transition-all"><MessageCircle size={16} /></button></>
                    )}
                    <button onClick={() => onActionDetail(tx)} className="p-3 bg-gray-50 text-black rounded-lg border border-gray-100 shadow-sm active:scale-95 transition-all"><Eye size={16} /></button>
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
            <div key={tx.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all font-bold ${isSelected ? 'border-black ring-1 ring-black' : 'border-gray-100'}`}>
              <div className="flex gap-4 items-center mb-4 font-bold">
                <button onClick={() => onToggleSelect(tx.id)} className={`${isSelected ? 'text-black' : 'text-gray-300'} shrink-0`}>
                  {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>
                <div className="w-16 h-16 relative rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                  {tx.featured_image ? (
                    <Image src={`/uploads/${tx.featured_image}`} alt="p" fill className="object-cover" unoptimized />
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
                    <button onClick={() => onActionRetur(tx)} className="flex items-center justify-center py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl"><RotateCcw size={18}/></button>
                    <button onClick={() => sendWhatsApp(tx.customer, tx.total, tx.due_date, tx.whatsapp)} className="flex items-center justify-center py-4 bg-green-50 text-green-600 border border-green-100 rounded-xl"><MessageCircle size={18}/></button></>
                )}
                <button onClick={() => onActionDetail(tx)} className={`flex items-center justify-center py-4 bg-gray-50 text-black border border-gray-100 rounded-xl ${tx.payment_status === 'LUNAS' || tx.status === 'RETURNED' ? 'col-span-4' : 'col-span-1'}`}><Eye size={18}/></button>
              </div>
            </div>
          )
        })}
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border border-gray-100 rounded-xl font-bold shadow-sm">
          <p className="text-[10px] uppercase text-gray-400 tracking-widest">
            Showing <span className="text-black">{data.length}</span> of <span className="text-black">{totalData}</span> Entries
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="p-3 bg-gray-50 rounded-lg disabled:opacity-30 text-black border border-gray-100 hover:bg-gray-100 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                if (pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 1) {
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${page === pNum ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:text-black'}`}
                    >
                      {pNum}
                    </button>
                  );
                }
                if (pNum === 2 || pNum === totalPages - 1) return <span key={pNum} className="px-1 text-gray-300">...</span>;
                return null;
              })}
            </div>
            <button 
              disabled={page === totalPages || loading}
              onClick={() => setPage(p => p + 1)}
              className="p-3 bg-gray-50 rounded-lg disabled:opacity-30 text-black border border-gray-100 hover:bg-gray-100 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}