'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Save, X, Shapes, Loader2, Search } from 'lucide-react'

interface ModelItem {
  id: string
  name: string
  slug: string
  createdAt?: string
}

export default function AdminModelPage() {
  const [model, setModel] = useState<ModelItem[]>([])
  const [newModel, setNewModel] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [editingModelName, setEditingModelName] = useState('')

  function slugify(text: string) {
    return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
  }

  // FETCH: Ambil data dari VPS
  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ 
          sql: 'SELECT * FROM public."Model" ORDER BY "createdAt" DESC' 
        })
      })
      const result = await res.json()
      if (result.data) setModel(result.data as ModelItem[])
    } catch (err) {
      console.error("Gagal load models:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { 
    fetchModels()
  }, [fetchModels])

  // ADD: Simpan model baru ke VPS
  async function handleAddModel(e: React.FormEvent) {
    e.preventDefault()
    if (!newModel.trim()) return
    setIsAdding(true)
    const slug = slugify(newModel)
    
    try {
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'INSERT INTO public."Model" (name, slug) VALUES ($1, $2) RETURNING *',
          params: [newModel, slug]
        })
      })
      const result = await res.json()

      if (result.error) {
        alert("Gagal tambah model: " + result.error)
      } else if (result.data) {
        setModel(prev => [result.data[0] as ModelItem, ...prev])
        setNewModel('') 
      }
    } catch (err) {
      alert("Masalah koneksi ke VPS!")
    } finally {
      setIsAdding(false)
    }
  }

  // DELETE: Hapus model dari VPS
  async function handleDeleteModel(id: string) {
    if (!confirm('Hapus model ini?')) return
    try {
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'DELETE FROM public."Model" WHERE id = $1',
          params: [id]
        })
      })
      const result = await res.json()
      if (result.error) alert(result.error)
      else setModel(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      alert("Gagal hapus!")
    }
  }

  // UPDATE: Edit nama model di VPS
  async function handleUpdateModel(id: string) {
    if (!editingModelName.trim()) return
    const slug = slugify(editingModelName)
    
    try {
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'UPDATE public."Model" SET name = $1, slug = $2 WHERE id = $3 RETURNING *',
          params: [editingModelName, slug, id]
        })
      })
      const result = await res.json()

      if (result.error) {
        alert(result.error)
      } else if (result.data) { 
        setModel(prev => prev.map(m => (m.id === id ? (result.data[0] as ModelItem) : m)))
        setEditingModelId(null)
        setEditingModelName('') 
      }
    } catch (err) {
      alert("Gagal update!")
    }
  }

  const filteredModels = model.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-140px)] font-sans text-black">
        
        {/* HEADER */}
        <div className="p-4 lg:p-6 border-b border-gray-100 bg-white sticky top-0 z-30 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-black italic uppercase flex items-center gap-2">
                <Shapes size={20} /> Model Manager
              </h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Total: <span className="text-black">{model.length} Model</span> 
              </p>
            </div>

            <form onSubmit={handleAddModel} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Model Baru (ex: Running)..."
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="flex-1 md:w-48 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-black transition-all uppercase text-black"
              />
              <button
                type="submit"
                disabled={isAdding || !newModel.trim()}
                className="bg-black text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase cursor-pointer flex items-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 shadow-lg disabled:opacity-50"
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
              placeholder="Cari model sepatu..." 
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
              <p className="text-[10px] font-black uppercase tracking-widest">Sinkronisasi Model...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Model Details</th>
                  <th className="px-6 py-4">Slug (URL Path)</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredModels.map((m) => (
                  <tr key={m.id} className="group hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4">
                      {editingModelId === m.id ? (
                        <input
                          type="text"
                          value={editingModelName}
                          onChange={(e) => setEditingModelName(e.target.value)}
                          className="w-full bg-white border-2 border-black rounded-md px-3 py-1.5 font-black text-xs uppercase outline-none text-black"
                          autoFocus
                        />
                      ) : (
                        <span className="font-black text-xs uppercase text-black">{m.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter italic">/{m.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {editingModelId === m.id ? (
                          <>
                            <button onClick={() => handleUpdateModel(m.id)} className="p-2 bg-black text-white rounded-md active:scale-90 shadow-lg"><Save size={14} /></button>
                            <button onClick={() => setEditingModelId(null)} className="p-2 bg-gray-100 text-gray-400 rounded-md"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => { setEditingModelId(m.id); setEditingModelName(m.name) }} 
                              className="p-2 text-gray-300 hover:text-black hover:bg-gray-100 rounded-md transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteModel(m.id)} 
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

          {!loading && filteredModels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Shapes className="text-black mb-4" size={48} />
              <p className="text-[10px] font-black text-black uppercase tracking-widest text-center">Model tidak ditemukan</p>
            </div>
          )}
        </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}