'use client'

import { PRODUCT_TYPES } from '@/lib/product-types'

type Props = { value: string; onChange: (value: string) => void }

export default function ProductTypeSelect({ value, onChange }: Props) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Tipe produk">
      {PRODUCT_TYPES.map((t) => {
        const active = value === t.value
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.value)}
            className={`flex-1 py-4 rounded-xl text-xs font-bold uppercase tracking-widest border-2 transition-all ${
              active
                ? 'bg-black border-black text-white shadow-lg'
                : 'bg-white border-gray-100 text-gray-400 hover:border-black hover:text-black'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}