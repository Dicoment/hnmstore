// Aturan harga satu tempat. price_promo = potongan harga (nominal),
// harga akhir = price_regular - price_promo (sama dengan logika sebelumnya).
export function getPriceInfo(
  regular: number | string | null | undefined,
  promo: number | string | null | undefined
) {
  const reg = Number(regular || 0)
  const discount = Number(promo || 0)
  const hasPromo = discount > 0
  return { hasPromo, regular: reg, final: hasPromo ? reg - discount : reg }
}

export const rupiah = (n: number) => `RP ${n.toLocaleString('id-ID')}`