'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Save, X, Tag, Loader2, Search } from 'lucide-react'

interface Brand {
  id: string
  name: string
  slug: string
  createdAt?: string
}

export default function AdminBrandPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [newBrand, setNewBrand] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const [editingBrandName, setEditingBrandName] = useState('')

  function slugify(text: string) {
    return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
  }

  // FETCH: Ambil data dari VPS
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ 
          sql: 'SELECT * FROM public."Brand" ORDER BY "createdAt" DESC' 
        })
      })
      const result = await res.json()
      if (result.data) setBrands(result.data as Brand[])
    } catch (err) {
      console.error("Gagal load brands:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { 
    fetchBrands()
  }, [fetchBrands])

  // ADD: Simpan brand baru ke VPS
  async function handleAddBrand(e: React.FormEvent) {
    e.preventDefault()
    if (!newBrand.trim()) return
    setIsAdding(true)
    const slug = slugify(newBrand)
    
    try {
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'INSERT INTO public."Brand" (name, slug) VALUES ($1, $2) RETURNING *',
          params: [newBrand, slug]
        })
      })
      const result = await res.json()
      
      if (result.error) {
        alert("Gagal tambah brand: " + result.error)
      } else if (result.data) {
        setBrands(prev => [result.data[0] as Brand, ...prev])
        setNewBrand('')
      }
    } catch (err) {
      alert("Koneksi ke VPS bermasalah!")
    } finally {
      setIsAdding(false)
    }
  }

  // DELETE: Hapus brand dari VPS
  async function handleDeleteBrand(id: string) {
    if (!confirm('Hapus brand ini? Produk dengan brand ini mungkin akan terpengaruh.')) return
    try {
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'DELETE FROM public."Brand" WHERE id = $1',
          params: [id]
        })
      })
      const result = await res.json()
      if (result.error) alert(result.error)
      else setBrands(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      alert("Gagal menghapus!")
    }
  }

  // UPDATE: Edit nama brand di VPS
  async function handleUpdateBrand(id: string) {
    if (!editingBrandName.trim()) return
    const slug = slugify(editingBrandName)
    
    try {
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'UPDATE public."Brand" SET name = $1, slug = $2 WHERE id = $3 RETURNING *',
          params: [editingBrandName, slug, id]
        })
      })
      const result = await res.json()

      if (result.error) {
        alert(result.error)
      } else if (result.data) {
        setBrands(prev => prev.map(b => (b.id === id ? (result.data[0] as Brand) : b)))
        setEditingBrandId(null)
        setEditingBrandName('') 
      }
    } catch (err) {
      alert("Gagal update!")
    }
  }

  const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-140px)] font-sans text-black">
      <div className="flex flex-col flex-1 bg-white border border-gray-200 overflow-hidden lg:rounded-xl lg:mx-4 lg:my-2 shadow-sm">
        
        {/* HEADER */}
        <div className="p-4 lg:p-6 border-b border-gray-100 bg-white sticky top-0 z-30 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-black uppercase flex items-center gap-2">
                <Tag size={20} /> Brand Manager
              </h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                Total: <span className="text-black">{brands.length} Merk</span> • Di Database Kamu
              </p>
            </div>

            <form onSubmit={handleAddBrand} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Tambah Brand Baru..."
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                className="flex-1 md:w-48 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-black transition-all uppercase text-black"
              />
              <button
                type="submit"
                disabled={isAdding || !newBrand.trim()}
                className="bg-black text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase flex items-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {isAdding ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                Tambah
              </button>
            </form>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari merk di database..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none focus:border-black text-black"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest">Memuat Data Brand...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Brand Details</th>
                  <th className="px-6 py-4">Slug (URL)</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="group hover:bg-gray-50/50 transition-all">
                    <td className="px-6 py-4">
                      {editingBrandId === brand.id ? (
                        <input
                          type="text"
                          value={editingBrandName}
                          onChange={(e) => setEditingBrandName(e.target.value)}
                          className="w-full bg-white border-2 border-black rounded-md px-3 py-1.5 font-black text-xs uppercase outline-none text-black"
                          autoFocus
                        />
                      ) : (
                        <span className="font-black text-xs uppercase text-black">{brand.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter italic">/{brand.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {editingBrandId === brand.id ? (
                          <>
                            <button onClick={() => handleUpdateBrand(brand.id)} className="p-2 bg-black text-white rounded-md active:scale-90 shadow-lg"><Save size={14} /></button>
                            <button onClick={() => setEditingBrandId(null)} className="p-2 bg-gray-100 text-gray-400 rounded-md"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => { setEditingBrandId(brand.id); setEditingBrandName(brand.name) }} 
                              className="p-2 text-gray-300 hover:text-black hover:bg-gray-100 rounded-md transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBrand(brand.id)} 
                              className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredBrands.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Tag className="text-black mb-4" size={48} />
              <p className="text-[10px] font-black text-black uppercase tracking-widest text-center">Brand tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}