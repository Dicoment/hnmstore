'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Upload, Trash2, Copy, Image as ImageIcon, 
  Loader2, Search, Square, CheckSquare, CheckCircle2
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
  
  // State baru untuk seleksi
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true)
      // Pakai path root sesuai yang tadi berhasil
      const { data, error } = await supabase.storage.from('ProductImage').list('', {
        limit: 200,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' },
      })

      if (error) throw error

      if (data) {
        let sizeAccumulator = 0
        const fileWithUrls = data.map((file) => {
          const fileSize = file.metadata?.size || 0
          sizeAccumulator += fileSize
          const { data: { publicUrl } } = supabase.storage.from('ProductImage').getPublicUrl(file.name)
          
          return {
            id: file.id,
            name: file.name,
            size: fileSize,
            url: publicUrl
          }
        })
        setFiles(fileWithUrls as any)
        setTotalSize(sizeAccumulator)
        setSelectedFiles([]) // Reset seleksi tiap refresh
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  // --- LOGIKA SELEKSI ---
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        const fileName = `${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from('ProductImage').upload(fileName, file)
        if (error) throw error
      }
      fetchMedia()
    } catch (err: any) {
      alert(err.message)
    } finally { setUploading(false) }
  }

  // --- LOGIKA HAPUS BULK ---
  async function handleDeleteSelected() {
    if (!confirm(`Hapus ${selectedFiles.length} file secara permanen?`)) return
    try {
      setLoading(true)
      const { error } = await supabase.storage.from('ProductImage').remove(selectedFiles)
      if (error) throw error
      fetchMedia()
    } catch (err: any) {
      alert(err.message)
    } finally { setLoading(false) }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] font-sans text-black">
      <div className="flex flex-col flex-1 bg-white border border-gray-200 overflow-hidden rounded-xl mx-4 my-2">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-30 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">Media Manager</h1>
              <p className="text-[10px] font-bold text-gray-400">STORAGE: {formatSize(totalSize)}</p>
            </div>
            
            <div className="flex gap-2">
              {selectedFiles.length > 0 && (
                <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase flex items-center gap-2 animate-in fade-in zoom-in">
                  <Trash2 size={14} /> Hapus ({selectedFiles.length})
                </button>
              )}
              <label className="bg-black text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase cursor-pointer flex items-center gap-2">
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                Upload
                <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Cari nama file..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {filteredFiles.length > 0 && (
              <button onClick={toggleSelectAll} className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-black text-[9px] uppercase flex items-center gap-2 whitespace-nowrap">
                {selectedFiles.length === filteredFiles.length ? <CheckSquare size={14} /> : <Square size={14} />}
                {selectedFiles.length === filteredFiles.length ? 'Deselect' : 'Select All'}
              </button>
            )}
          </div>
        </div>

        {/* GRID */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          {loading && files.length === 0 ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pb-10">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.includes(file.name)
                return (
                  <div 
                    key={file.id} 
                    onClick={() => toggleSelect(file.name)} 
                    className={`group relative bg-white border rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? 'border-black ring-2 ring-black' : 'border-gray-100'}`}
                  >
                    <div className="aspect-square relative bg-gray-50">
                      <Image src={file.url} alt={file.name} fill className={`object-cover ${isSelected ? 'opacity-70 scale-95' : ''}`} unoptimized />
                      <div className={`absolute top-2 left-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isSelected ? <CheckCircle2 className="text-black bg-white rounded-full shadow-lg" size={20} /> : <Square className="text-gray-400 bg-white/80 rounded-sm" size={18} />}
                      </div>
                    </div>
                    <div className="p-5 border-t border-gray-50">
                      <p className="text-[12px] font-medium truncate uppercase text-black">{file.name}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}