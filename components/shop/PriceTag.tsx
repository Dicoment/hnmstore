import { getPriceInfo, rupiah } from '@/lib/price'

type Props = {
  regular: number | string | null | undefined
  promo: number | string | null | undefined
}

export default function PriceTag({ regular, promo }: Props) {
  const { hasPromo, regular: reg, final } = getPriceInfo(regular, promo)

  if (hasPromo) {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-sm md:text-lg tracking-tighter text-red-600 leading-none">{rupiah(final)}</p>
        <p className="text-[10px] text-zinc-400 line-through font-medium">{rupiah(reg)}</p>
      </div>
    )
  }
  return <p className="text-sm md:text-lg tracking-tighter">{rupiah(reg)}</p>
}