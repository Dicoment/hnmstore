'use client'

import { useState, useEffect, useCallback } from 'react'
import { Edit2, Trash2, Save, X, Tag, Loader2, ImageIcon, ImagePlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminBrandPage() {
  const [brands, setBrands] = useState<any[]>([])
  const [newBrand, setNewBrand] = useState('')
  const [selectedImage, setSelectedImage] = useState('') 
  const [mediaFiles, setMediaFiles] = useState<any[]>([])
  const [isMediaOpen, setIsMediaOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT * FROM public."Brand" ORDER BY "createdAt" DESC' })
      })
      const result = await res.json()
      setBrands(result.data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/media')
      const result = await res.json()
      setMediaFiles(result.data || [])
    } catch (err) { console.error(err) }
  }

  useEffect(() => { 
    fetchBrands()
    fetchMedia()
  }, [fetchBrands])

  async function handleAddBrand() {
    if (!newBrand.trim()) return
    const slug = newBrand.toLowerCase().replace(/\s+/g, '-')
    try {
      await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'INSERT INTO public."Brand" (name, slug, images) VALUES ($1, $2, $3)',
          params: [newBrand, slug, selectedImage]
        })
      })
      await fetch('/api/revalidate?secret=tri_rahasia_123')
      setNewBrand(''); setSelectedImage(''); fetchBrands()
    } catch (err) { alert("Gagal tambah brand") }
  }

  async function handleUpdateBrand(id: string) {
    if (!editName.trim()) return
    const slug = editName.toLowerCase().replace(/\s+/g, '-')
    try {
      await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'UPDATE public."Brand" SET name = $1, slug = $2 WHERE id = $3',
          params: [editName, slug, id]
        })
      })
      await fetch('/api/revalidate?secret=tri_rahasia_123')
      setEditingId(null); setEditName(''); fetchBrands()
    } catch (err) { alert("Gagal update brand") }
  }

  async function handleDeleteBrand(id: string) {
    if (!confirm('Hapus brand ini?')) return
    try {
      await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'DELETE FROM public."Brand" WHERE id = $1', params: [id] })
      })
      await fetch('/api/revalidate?secret=tri_rahasia_123'); fetchBrands()
    } catch (err) { alert("Gagal hapus brand") }
  }

  return (
    <div className="p-4 font-sans text-black min-h-screen w-full overflow-x-hidden">
        
        {/* HEADER SECTION */}
        <div className="p-6 border-b border-zinc-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold uppercase flex items-center gap-3 tracking-tighter text-black">
              <Tag className="text-zinc-400" /> Brand <span className="text-zinc-300">Manager.</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <input 
              placeholder="NAMA BRAND..." 
              value={newBrand} 
              onChange={e => setNewBrand(e.target.value)}
              className="flex-1 lg:w-48 px-4 py-3 bg-zinc-50 border-2 border-transparent focus:border-black rounded-2xl text-xs font-bold uppercase outline-none text-black"
            />
            <button 
              onClick={() => { setEditingId(null); setIsMediaOpen(true); }}
              className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2 text-xs font-bold uppercase ${selectedImage ? 'bg-black text-white border-black shadow-lg' : 'bg-zinc-100 border-zinc-100 text-zinc-400'}`}
            >
              {selectedImage ? <img src={`/uploads/${selectedImage}`} className="w-5 h-5 object-contain" alt="p" /> : <ImagePlus size={18} />}
              <span className="hidden sm:inline">LOGO</span>
            </button>
            <button onClick={handleAddBrand} className="bg-black text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase shadow-xl hover:bg-zinc-800 transition-all">TAMBAH</button>
          </div>
        </div>

        {/* LIST TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-zinc-50 font-bold">
              {loading ? (
                <tr><td colSpan={2} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-zinc-300" size={30} /></td></tr>
              ) : brands.map(brand => (
                <tr key={brand.id} className="group hover:bg-zinc-50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div onClick={() => { setEditingId(brand.id); setIsMediaOpen(true); }} className="w-14 h-14 bg-white border-2 border-zinc-100 rounded-2xl flex items-center justify-center overflow-hidden p-2 cursor-pointer hover:border-black transition-all relative shrink-0">
                        {brand.images ? <img src={`/uploads/${brand.images}`} className="object-contain w-full h-full" alt="b" /> : <ImageIcon className="text-zinc-200" />}
                      </div>
                      <div className="min-w-0">
                        {editingId === brand.id && editName !== '' ? (
                          <div className="flex items-center gap-2"><input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-2 border-black rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none" /><button onClick={() => handleUpdateBrand(brand.id)} className="p-2.5 bg-black text-white rounded-xl shadow-lg"><Save size={14} /></button></div>
                        ) : (
                          <div className="text-black"><p className="text-sm truncate uppercase">{brand.name}</p><p className="text-[10px] text-gray-300 tracking-widest">{brand.slug}</p></div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingId(brand.id); setEditName(brand.name); }} className="p-3 text-zinc-300 hover:text-black hover:bg-zinc-100 rounded-xl transition-all"><Edit2 size={16} /></button><button onClick={() => handleDeleteBrand(brand.id)} className="p-3 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* MODAL MEDIA - FIX MOBILE STACKING */}
      {isMediaOpen && (
        <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 lg:p-10">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 border-b border-zinc-100 flex justify-between items-center bg-white shrink-0">
              <div className="space-y-1">
                <h2 className="font-bold uppercase tracking-tighter text-lg lg:text-xl text-black">Media <span className="text-zinc-300">Vault.</span></h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select brand identity</p>
              </div>
              <button onClick={() => setIsMediaOpen(false)} className="p-3 hover:bg-zinc-100 rounded-2xl transition-all text-black"><X size={24} /></button>
            </div>
            
            {/* GRID FIX: BLOCKING SEMUA FLEX/AUTO-ROWS RUSAK */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 bg-zinc-50/50 content-start">
              {mediaFiles.length > 0 ? mediaFiles.map(file => (
                <div key={file.id} className="w-full">
                  <button 
                    onClick={() => {
                      if (editingId) {
                        fetch('/api/vps-db', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sql: 'UPDATE public."Brand" SET images = $1 WHERE id = $2', params: [file.name, editingId] })
                        }).then(() => { fetchBrands(); setEditingId(null); });
                      } else { setSelectedImage(file.name) }
                      setIsMediaOpen(false)
                    }}
                    className="w-full aspect-square bg-white border-2 border-transparent hover:border-black rounded-3xl overflow-hidden p-4 group transition-all relative shadow-sm flex items-center justify-center"
                  >
                    <img src={file.url} className="w-full h-full object-contain group-hover:scale-110 transition-transform" alt="img" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[7px] text-white p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-widest">{file.name}</div>
                  </button>
                </div>
              )) : (
                <div className="col-span-full py-40 flex flex-col items-center justify-center text-zinc-200"><ImageIcon size={48} strokeWidth={1} /><p className="mt-4 font-bold uppercase tracking-widest text-[10px]">Vault is empty</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}