'use client'

import { Calendar, X } from 'lucide-react'

interface Props {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

export default function DateRangeFilter({ from, to, onChange }: Props) {
  const hasValue = from || to

  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
      {/* min-w-0 wajib: tanpa ini input date menolak menyusut di layar kecil */}
      <div className="relative flex-1 min-w-0 md:flex-none">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange(e.target.value, to)}
          className="w-full min-w-0 md:w-44 pl-9 md:pl-10 pr-2 md:pr-3 py-3.5 bg-gray-50 rounded-xl text-[11px] md:text-xs uppercase outline-none border-none shadow-sm font-bold"
        />
      </div>
      <span className="text-xs text-gray-400 shrink-0">s/d</span>
      <div className="relative flex-1 min-w-0 md:flex-none">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange(from, e.target.value)}
          className="w-full min-w-0 md:w-44 pl-9 md:pl-10 pr-2 md:pr-3 py-3.5 bg-gray-50 rounded-xl text-[11px] md:text-xs uppercase outline-none border-none shadow-sm font-bold"
        />
      </div>
      {hasValue && (
        <button
          onClick={() => onChange('', '')}
          title="Hapus filter tanggal"
          className="shrink-0 p-3.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}