'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
  className?: string // ganti gaya pembungkus; kosongkan untuk tanpa margin/garis
}

// 1 ... 4 5 6 ... 31  (tidak menampilkan semua nomor halaman)
function getPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)
  return pages
}

export default function Pagination({ currentPage, totalPages, onChange, className = 'mt-20 pt-12 border-t-2 border-zinc-100' }: Props) {
  if (totalPages <= 1) return null

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 font-bold ${className}`}>
      <button
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-3 rounded-xl border-2 border-zinc-100 disabled:opacity-30 hover:border-black transition-all text-black"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={20} />
      </button>

      {getPages(currentPage, totalPages).map((page, i) =>
        page === '...' ? (
          <span key={`gap-${i}`} className="px-1 text-zinc-400">…</span>
        ) : (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 transition-all ${
              currentPage === page
                ? 'bg-black border-black text-white shadow-xl'
                : 'bg-white border-zinc-100 hover:border-black text-black'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-3 rounded-xl border-2 border-zinc-100 disabled:opacity-30 hover:border-black transition-all text-black"
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}