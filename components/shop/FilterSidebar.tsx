'use client'

import { Filter, X, ChevronRight } from 'lucide-react'
import { PRODUCT_TYPES, typeLabel } from '@/lib/product-types'

export type FilterOption = { id: string; name: string; slug: string }

type Props = {
  brands: FilterOption[]
  models: FilterOption[]
  activeType: string // 'all' | 'sepatu' | 'baju' | ...
  activeBrand: string // slug, 'all', atau UUID lama (link lama tetap jalan)
  activeModel: string
  open: boolean // hanya untuk tampilan mobile
  onClose: () => void
  onTypeChange: (type: string) => void
  onBrandChange: (slug: string) => void
  onModelChange: (slug: string) => void
}

const isActive = (o: FilterOption, active: string) => active === o.slug || active === o.id

export default function FilterSidebar({
  brands, models, activeType, activeBrand, activeModel, open,
  onClose, onTypeChange, onBrandChange, onModelChange,
}: Props) {
  const pickBrand = (slug: string) => { onBrandChange(slug); onClose() }
  const pickModel = (slug: string) => { onModelChange(slug); onClose() }

  const modelTitle = activeType === 'all' ? 'Kategori' : `Kategori ${typeLabel(activeType)}`

  return (
    <aside
      className={`fixed inset-0 z-100 bg-white p-8 overflow-y-auto transition-transform duration-500
        lg:relative lg:inset-auto lg:z-0 lg:p-0 lg:w-80 lg:shrink-0 lg:self-stretch lg:overflow-visible lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center justify-between lg:hidden mb-8 border-b-2 border-zinc-100 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-tighter">Filter</h2>
        <button onClick={onClose} className="p-2 bg-zinc-100 rounded-lg" aria-label="Tutup filter">
          <X size={20} />
        </button>
      </div>

      <div className="sticky top-28 space-y-10">
        <div className="hidden lg:flex items-center gap-3 border-b-2 border-black pb-4 font-bold">
          <Filter size={20} strokeWidth={3} />
          <h2 className="text-xl uppercase tracking-tighter">Filter Koleksi</h2>
        </div>

        <div className="space-y-6">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em]">Jenis Produk</p>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={activeType === 'all'} label="Semua" onClick={() => onTypeChange('all')} />
            {PRODUCT_TYPES.map((t) => (
              <FilterButton key={t.value} active={activeType === t.value} label={t.label} onClick={() => onTypeChange(t.value)} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em]">{modelTitle}</p>
          {models.length === 0 ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Belum ada kategori</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <FilterButton active={activeModel === 'all'} label="Semua" onClick={() => pickModel('all')} />
              {models.map((m) => (
                <FilterButton key={m.id} active={isActive(m, activeModel)} label={m.name} onClick={() => pickModel(m.slug)} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em]">Pilih Brand</p>
          <div className="flex flex-col gap-1">
            <BrandButton active={activeBrand === 'all'} label="Semua Merk" onClick={() => pickBrand('all')} />
            {brands.map((b) => (
              <BrandButton key={b.id} active={isActive(b, activeBrand)} label={b.name} onClick={() => pickBrand(b.slug)} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

type ButtonProps = { active: boolean; label: string; onClick: () => void }

function FilterButton({ active, label, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-4 rounded-xl text-[10px] font-bold uppercase transition-all border-2 ${
        active
          ? 'bg-black border-black text-white shadow-lg'
          : 'bg-white border-zinc-100 text-zinc-400 hover:border-black hover:text-black'
      }`}
    >
      {label}
    </button>
  )
}

function BrandButton({ active, label, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${
        active
          ? 'bg-zinc-50 border-black font-bold text-black'
          : 'bg-white border-transparent text-zinc-400 font-bold hover:bg-zinc-50 hover:text-black'
      }`}
    >
      <span className="text-xs uppercase">{label}</span>
      {active && <ChevronRight size={14} />}
    </button>
  )
}