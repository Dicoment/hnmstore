'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { X, CheckCircle2, Search } from 'lucide-react'

export type MediaFile = { name: string; url?: string }

type Props = {
  open: boolean
  files: MediaFile[]
  selected: string[] // daftar nama file yang sudah dipilih
  onToggle: (fileName: string) => void
  onClose: () => void
  title?: string
}

const PAGE_SIZE = 60 // library bisa ribuan gambar; tampilkan bertahap supaya ringan

export default function MediaLibraryModal({ open, files, selected, onToggle, onClose, title = 'Library Gambar' }: Props) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files
  }, [files, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 lg:p-10 text-black">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl">
        <div className="p-6 lg:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white z-20">
          <div className="space-y-1">
            <h3 className="font-bold uppercase tracking-tighter text-2xl leading-none">{title}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{filtered.length} file</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE) }}
                placeholder="Cari nama file..."
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold focus:ring-1 focus:ring-black"
              />
            </div>
            <button onClick={onClose} className="bg-gray-100 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90" aria-label="Tutup">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/50">
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-xs">
              {files.length === 0 ? 'Library kosong' : 'Tidak ada file yang cocok'}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 lg:gap-6">
              {filtered.slice(0, limit).map((file) => {
                const isSelected = selected.includes(file.name)
                return (
                  <button
                    type="button"
                    key={file.name}
                    title={file.name}
                    onClick={() => onToggle(file.name)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-4 transition-all duration-300 group shadow-sm text-left ${
                      isSelected ? 'border-black scale-[0.96] shadow-xl' : 'border-white hover:border-gray-200'
                    }`}
                  >
                    <Image
                      src={file.url || `/uploads/${file.name}`}
                      alt={file.name}
                      fill
                      sizes="(max-width: 768px) 33vw, 15vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      unoptimized
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <CheckCircle2 className="text-white" size={32} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {filtered.length > limit && (
            <div className="pt-8 text-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className="px-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-black transition-all"
              >
                Tampilkan lebih banyak ({filtered.length - limit})
              </button>
            </div>
          )}
        </div>

        <div className="p-6 lg:p-8 bg-white border-t border-gray-100 flex justify-between items-center z-20">
          <p className="text-sm font-bold uppercase">{selected.length} file terpilih</p>
          <button onClick={onClose} className="bg-black text-white px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-zinc-800 transition-all active:scale-95">
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}