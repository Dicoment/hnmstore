// Tipe produk. Mau tambah tipe baru (mis. Aksesoris)? Cukup tambah satu baris di sini.
export const PRODUCT_TYPES = [
  { value: 'sepatu', label: 'Sepatu' },
  { value: 'baju', label: 'Baju' },
] as const

export type ProductType = (typeof PRODUCT_TYPES)[number]['value']
export const DEFAULT_PRODUCT_TYPE: ProductType = 'sepatu'

export function isProductType(v: unknown): v is ProductType {
  return PRODUCT_TYPES.some((t) => t.value === v)
}

export function typeLabel(v: string | null | undefined) {
  return PRODUCT_TYPES.find((t) => t.value === v)?.label ?? ''
}

// --- Urutan ukuran: 36, 37, ... 48  dan  S, M, L, XL, XXL ---
const LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const isNumeric = (v: string) => /^\d+(\.\d+)?$/.test(v)

function groupOf(value: string): 'num' | 'letter' | 'other' {
  const v = value.trim().toUpperCase()
  if (isNumeric(v)) return 'num'
  return LETTER_SIZES.includes(v) ? 'letter' : 'other'
}

// Semua ukuran tetap tampil; ukuran yang cocok dengan tipe produk ditaruh paling atas.
export function sortSizes<T extends { value: string }>(sizes: T[], type?: string | null): T[] {
  const order = type === 'baju' ? { letter: 0, num: 1, other: 2 } : { num: 0, letter: 1, other: 2 }
  return [...sizes].sort((a, b) => {
    const ga = groupOf(a.value)
    const gb = groupOf(b.value)
    if (ga !== gb) return order[ga] - order[gb]
    if (ga === 'num') return Number(a.value) - Number(b.value)
    if (ga === 'letter') return LETTER_SIZES.indexOf(a.value.trim().toUpperCase()) - LETTER_SIZES.indexOf(b.value.trim().toUpperCase())
    return a.value.localeCompare(b.value)
  })
}