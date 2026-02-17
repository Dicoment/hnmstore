'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await supabase
        .from('Brand')
        .select('*')
        .order('createdAt', { ascending: false })
      if (data) setBrands(data as Brand[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { 
    fetchBrands()
  }, [fetchBrands])

  async function handleAddBrand(e: React.FormEvent) {
    e.preventDefault()
    if (!newBrand.trim()) return
    setIsAdding(true)
    const slug = slugify(newBrand)
    
    const { data, error } = await supabase
      .from('Brand')
      .insert([{ name: newBrand, slug }])
      .select()

    if (error) {
      alert(error.message)
    } else if (data) { 
      setBrands(prev => [data[0] as Brand, ...prev])
      setNewBrand('') 
    }
    setIsAdding(false)
  }

  async function handleDeleteBrand(id: string) {
    if (!confirm('Hapus brand ini?')) return
    const { error } = await supabase.from('Brand').delete().eq('id', id)
    if (error) alert(error.message)
    else setBrands(prev => prev.filter(b => b.id !== id))
  }

  async function handleUpdateBrand(id: string) {
    if (!editingBrandName.trim()) return
    const slug = slugify(editingBrandName)
    
    const { data, error } = await supabase
      .from('Brand')
      .update({ name: editingBrandName, slug })
      .eq('id', id)
      .select()

    if (error) {
      alert(error.message)
    } else if (data) { 
      setBrands(prev => prev.map(b => (b.id === id ? (data[0] as Brand) : b)))
      setEditingBrandId(null)
      setEditingBrandName('') 
    }
  }

  const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] font-sans text-black">
      <div className="flex flex-col flex-1 bg-white border border-gray-200 overflow-hidden rounded-xl mx-4 my-2">
        
        {/* HEADER: Selaras sama Media Manager */}
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-30 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black italic uppercase flex items-center gap-2">
                <Tag size={20} /> Brand Manager
              </h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Total: <span className="text-black">{brands.length} Merk</span>
              </p>
            </div>

            <form onSubmit={handleAddBrand} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tambah Brand..."
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                className="hidden md:block w-48 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-black transition-all uppercase"
              />
              <button
                type="submit"
                disabled={isAdding || !newBrand.trim()}
                className="bg-black text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase cursor-pointer flex items-center gap-2 hover:bg-zinc-800 transition-all active:scale-95"
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
              placeholder="Cari merk..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none focus:border-black"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* CONTENT: Selaras sama Tabel Produk */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Brand Details</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="group hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4">
                      {editingBrandId === brand.id ? (
                        <input
                          type="text"
                          value={editingBrandName}
                          onChange={(e) => setEditingBrandName(e.target.value)}
                          className="w-full bg-white border border-black rounded-md px-3 py-1.5 font-black text-xs uppercase outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-black text-xs uppercase text-black">{brand.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">{brand.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {editingBrandId === brand.id ? (
                          <>
                            <button onClick={() => handleUpdateBrand(brand.id)} className="p-2 bg-black text-white rounded-md active:scale-90"><Save size={14} /></button>
                            <button onClick={() => setEditingBrandId(null)} className="p-2 bg-gray-100 text-gray-400 rounded-md"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => { setEditingBrandId(brand.id); setEditingBrandName(brand.name) }} 
                              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBrand(brand.id)} 
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
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
            <div className="flex flex-col items-center justify-center py-20">
              <Tag className="text-gray-200 mb-4" size={48} />
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">Brand tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}