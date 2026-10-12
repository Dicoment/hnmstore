'use client'

import { useRef, useState } from 'react'
import { Type, List, FileText, Eye, EyeOff } from 'lucide-react'
import ProductDescription from '@/components/shop/ProductDescription'

const TEMPLATE = `Tulis paragraf pembuka di sini.

KEUNGGULAN PRODUK
- Bahan: tulis detail bahan.
- Kenyamanan: tulis detail kenyamanan.

KEBIJAKAN RETUR
Tulis ketentuan retur di sini.`

interface Props {
  value: string
  onChange: (value: string) => void
  rows?: number
}

export default function DescriptionEditor({ value, onChange, rows = 10 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Sisipkan teks di posisi kursor (selalu mulai di baris baru)
  const insert = (text: string) => {
    const el = ref.current
    if (!el) {
      onChange(value + text)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = value.slice(0, start)
    const after = value.slice(end)
    const prefix = before && !before.endsWith('\n') ? '\n' : ''
    const inserted = prefix + text
    onChange(before + inserted + after)
    requestAnimationFrame(() => {
      el.focus()
      const pos = (before + inserted).length
      el.setSelectionRange(pos, pos)
    })
  }

  const insertTemplate = () => {
    onChange(value.trim() ? value.replace(/\s+$/, '') + '\n\n' + TEMPLATE : TEMPLATE)
  }

  const btn =
    'flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:border-black active:scale-95 transition-all text-black'

  return (
    <div className="space-y-3">
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => insert('NAMA BAGIAN\n')} className={btn}>
          <Type size={12} /> Judul
        </button>
        <button type="button" onClick={() => insert('- ')} className={btn}>
          <List size={12} /> Poin
        </button>
        <button type="button" onClick={insertTemplate} className={btn}>
          <FileText size={12} /> Template
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={`${btn} ml-auto ${showPreview ? 'bg-black text-white border-black' : ''}`}
        >
          {showPreview ? <EyeOff size={12} /> : <Eye size={12} />} Pratinjau
        </button>
      </div>

      <textarea
        ref={ref}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Tulis deskripsi produk...\n\nTiap paragraf di baris sendiri.'}
        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 outline-none font-medium text-[13px] text-black resize-y focus:ring-1 focus:ring-black transition-all leading-relaxed"
      />

      <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
        Tips: tulis tiap paragraf di baris sendiri. <b>Judul bagian</b>: HURUF BESAR atau diakhiri titik dua (:).{' '}
        <b>Poin</b>: awali dengan <code>- </code> (strip lalu spasi). Awalan seperti &quot;Bahan: ...&quot; otomatis
        ditebalkan pada poin.
      </p>

      {/* PRATINJAU: persis seperti di halaman toko */}
      {showPreview && (
        <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Pratinjau di toko</p>
          <ProductDescription text={value} />
        </div>
      )}
    </div>
  )
}