'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Upload, Trash2, Image as ImageIcon, 
  Loader2, Search, Square, CheckSquare, CheckCircle2,
  Package, RefreshCcw
} from 'lucide-react'
import Image from 'next/image'

interface MediaFile {
  name: string
  id: string
  url: string
  size: number
}

export default function MediaManagerPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalSize, setTotalSize] = useState(0)
  
  const [activeBucket, setActiveBucket] = useState<'ProductImage' | 'ReturnImage'>('ProductImage')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  // FETCH: Ambil data dari VPS berdasarkan tab yang aktif
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/media?bucket=${activeBucket}`)
      const result = await res.json()

      if (result.data) {
        setFiles(result.data)
        const sizeAccumulator = result.data.reduce((acc: number, f: any) => acc + f.size, 0)
        setTotalSize(sizeAccumulator)
        setSelectedFiles([]) 
      }
    } catch (err) {
      console.error("Gagal sinkron media VPS:", err)
    } finally {
      setLoading(false)
    }
  }, [activeBucket])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  // UPLOAD: Simpan ke folder VPS & Trigger Revalidate Otomatis
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', activeBucket === 'ProductImage' ? 'products' : 'returns')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        if (!res.ok) throw new Error("Gagal upload ke VPS")
      }

      // MEMAKSA NEXT.JS REFRESH CACHE (Biar gambar gak pecah)
      await fetch('/api/revalidate?secret=tri_rahasia_123')
      
      fetchMedia()
    } catch (err: any) {
      alert("Upload Gagal: " + err.message)
    } finally { setUploading(false) }
  }

  // DELETE: Hapus file fisik di VPS & Trigger Revalidate Otomatis
  async function handleDeleteSelected() {
    if (!confirm(`Hapus ${selectedFiles.length} file dari ${activeBucket} secara permanen?`)) return
    try {
      setLoading(true)
      const res = await fetch('/api/media', {
        method: 'DELETE',
        body: JSON.stringify({ 
          filenames: selectedFiles,
          bucket: activeBucket 
        })
      })

      if (!res.ok) throw new Error("Gagal hapus file di VPS")

      // MEMAKSA NEXT.JS REFRESH CACHE
      await fetch('/api/revalidate?secret=tri_rahasia_123')

      alert(`Berhasil menghapus ${selectedFiles.length} file!`)
      fetchMedia()
    } catch (err: any) {
      alert("Hapus Gagal: " + err.message)
    } finally { setLoading(false) }
  }

  const toggleSelect = (fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) ? prev.filter(n => n !== fileName) : [...prev, fileName]
    )
  }

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(f => f.name))
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-140px)] font-sans text-black">
      <div className="flex flex-col flex-1 bg-white border border-gray-200 overflow-hidden lg:rounded-xl lg:mx-4 lg:my-2 shadow-sm">
        
        {/* HEADER */}
        <div className="p-4 lg:p-6 border-b border-gray-100 bg-white sticky top-0 z-30 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">Media Manager</h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${activeBucket === 'ProductImage' ? 'bg-black text-white' : 'bg-orange-500 text-white'}`}>
                   {activeBucket === 'ProductImage' ? 'Catalog' : 'Returns'}
                 </span>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Total: {formatSize(totalSize)}</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {selectedFiles.length > 0 && (
                <button onClick={handleDeleteSelected} className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Trash2 size={14} /> <span className="sm:hidden lg:inline">Hapus</span> ({selectedFiles.length})
                </button>
              )}
              <label className="flex-1 sm:flex-none bg-black text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95">
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                Upload Baru
                <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
               <button 
                onClick={() => setActiveBucket('ProductImage')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeBucket === 'ProductImage' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}
               >
                 <Package size={14} /> Produk
               </button>
               <button 
                onClick={() => setActiveBucket('ReturnImage')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeBucket === 'ReturnImage' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}
               >
                 <RefreshCcw size={14} /> Retur
               </button>
            </div>

            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder={`Cari di folder ${activeBucket === 'ProductImage' ? 'products' : 'returns'}...`} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none focus:border-black" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>

              {filteredFiles.length > 0 && (
                <button onClick={toggleSelectAll} className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-black text-[9px] uppercase flex items-center gap-2 whitespace-nowrap active:bg-gray-50">
                  {selectedFiles.length === filteredFiles.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span className="hidden sm:inline">{selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* GRID GAMBAR */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-white custom-scrollbar">
          {loading && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest">Sinkronisasi Media...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 text-black">
              <ImageIcon size={64} />
              <p className="text-[10px] font-black mt-4 uppercase tracking-[0.5em]">Folder Kosong</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4 pb-10">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.includes(file.name)
                return (
                  <div 
                    key={file.id} 
                    onClick={() => toggleSelect(file.name)} 
                    className={`group relative bg-white border rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? 'border-black ring-2 ring-black' : 'border-gray-100 hover:border-gray-300 shadow-sm'}`}
                  >
                    <div className="aspect-square relative bg-gray-50">
                      <Image 
                        src={file.url} 
                        alt={file.name} 
                        fill 
                        className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isSelected ? 'opacity-70 scale-95' : ''}`} 
                        unoptimized 
                      />
                      <div className={`absolute top-2 left-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isSelected ? <CheckCircle2 className="text-black bg-white rounded-full shadow-lg" size={18} /> : <Square className="text-white bg-black/20 backdrop-blur-sm rounded-sm" size={16} />}
                      </div>
                    </div>
                    <div className="p-3 border-t border-gray-50 bg-white">
                      <p className="text-[10px] font-black truncate uppercase text-black leading-tight mb-1">{file.name}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase italic">{formatSize(file.size)}</p>
                    </div>
                  </div>
                )
              })}
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