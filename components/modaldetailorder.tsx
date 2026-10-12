'use client'

import { X, ShoppingBag, User, Smartphone, ImageIcon, UserCheck, Printer } from 'lucide-react'
import Image from 'next/image'

interface ModalDetailOrderProps {
  show: boolean
  onClose: () => void
  selectedTx: any
}

const rupiah = (n: number | string) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

// Cegah karakter aneh di nama pelanggan merusak HTML struk
const esc = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export default function ModalDetailOrder({ show, onClose, selectedTx }: ModalDetailOrderProps) {
  if (!show || !selectedTx) return null

  // Parsing items dari JSON string ke array object
  const items = typeof selectedTx.items === 'string' ? JSON.parse(selectedTx.items) : selectedTx.items

  const handlePrint = () => {
    const tgl = new Date(selectedTx.created_at)
    const tanggal = tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    const jam = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const isDebt = selectedTx.payment_status === 'HUTANG'
    const isReturned = selectedTx.status === 'RETURNED'
    const discount = Number(selectedTx.discount || 0)

    const itemRows = items
      .map(
        (it: any) => `
        <div class="item">
          <div class="name">${esc(it.name)}</div>
          <div class="row">
            <span>${esc(it.quantity)} x ${rupiah(it.price)} (SZ ${esc(it.size)})</span>
            <span>${rupiah(it.price * it.quantity)}</span>
          </div>
        </div>`
      )
      .join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resi INV-${esc(selectedTx.id.toString().slice(0, 8))}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      width: 72mm; margin: 0 auto; padding: 4mm 0;
      font-family: 'Courier New', monospace; font-size: 12px; color: #000;
    }
    .center { text-align: center; }
    .brand { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
    .muted { font-size: 11px; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .item { margin-bottom: 5px; }
    .name { font-weight: bold; text-transform: uppercase; }
    .total { font-size: 14px; font-weight: bold; }
    .stamp { text-align: center; font-weight: bold; border: 1px solid #000; padding: 3px; margin: 6px 0; }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">HNM STORE</div>
    <div class="muted">Resi Penjualan</div>
    <div class="muted">Banyuputih, Kalinyamatan, Kabupaten Jepara, Jawa Tengah</div>
</div>
  <div class="line"></div>

  <div class="row"><span>No</span><span>INV-${esc(selectedTx.id.toString().slice(0, 8).toUpperCase())}</span></div>
  <div class="row"><span>Tanggal</span><span>${tanggal}</span></div>
  <div class="row"><span>Jam</span><span>${jam} WIB</span></div>
  <div class="row"><span>Kasir</span><span>${esc(selectedTx.admin_name || '-')}</span></div>
  <div class="row"><span>Customer</span><span>${esc(selectedTx.customer)}</span></div>
  ${selectedTx.whatsapp ? `<div class="row"><span>WA</span><span>${esc(selectedTx.whatsapp)}</span></div>` : ''}

  <div class="line"></div>
  ${itemRows}
  <div class="line"></div>

  <div class="row"><span>Subtotal</span><span>${rupiah(selectedTx.subtotal)}</span></div>
  ${discount > 0 ? `<div class="row"><span>Diskon</span><span>-${rupiah(discount)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>${rupiah(selectedTx.total)}</span></div>

  <div class="line"></div>
  <div class="row"><span>Pembayaran</span><span>${esc(selectedTx.payment_method || '-')}</span></div>
  <div class="row"><span>Status</span><span>${esc(selectedTx.payment_status || '-')}</span></div>
  ${
    isDebt && selectedTx.due_date
      ? `<div class="row"><span>Jatuh Tempo</span><span>${new Date(selectedTx.due_date).toLocaleDateString('id-ID')}</span></div>`
      : ''
  }
  ${isReturned ? '<div class="stamp">TRANSAKSI DIRETUR</div>' : ''}

  <div class="line"></div>
  <div class="center muted">
    Terima kasih sudah berbelanja!<br/>
    Komplain & penukaran produk wajib menyertakan video unboxing dan tunduk pada Syarat & Ketentuan Kebijakan Retur HnM Store.
  </div>
</body>
</html>`

    // Pakai iframe tersembunyi supaya tidak kena blokir popup
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc || !iframe.contentWindow) return
    doc.open()
    doc.write(html)
    doc.close()

    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1500)
    }
    // Cadangan kalau onload tidak terpanggil
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => iframe.parentNode && document.body.removeChild(iframe), 1500)
      }
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200 text-black font-bold">

        {/* HEADER */}
        <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-3 text-black">
            <ShoppingBag size={18} /> Detail Order
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 lg:p-8 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* INFO CUSTOMER */}
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 space-y-2 font-bold text-xs uppercase text-blue-700">
            <div className="flex items-center gap-3">
              <User size={16} /> {selectedTx.customer}
            </div>
            <div className="flex items-center gap-3 text-blue-300">
              <Smartphone size={16} /> {selectedTx.whatsapp || 'No WhatsApp'}
            </div>
            {selectedTx.admin_name && (
              <div className="flex items-center gap-3 text-blue-500">
                <UserCheck size={16} /> Kasir: {selectedTx.admin_name}
              </div>
            )}
            <div className="text-blue-300 leading-none mt-1 text-[10px]">
              INV-{selectedTx.id.toString()}
            </div>
          </div>

          {/* LIST ITEMS */}
          <div className="space-y-3">
            {items.map((item: any, i: number) => {
              const imgFile =
                item.image ||
                (item.images && item.images[0]) ||
                selectedTx.product_images?.[0]

              return (
                <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-xl bg-white items-center shadow-sm">
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                    {imgFile ? (
                      <Image
                        src={`/uploads/${imgFile}`}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase truncate text-black">{item.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase mt-1 leading-none font-bold">
                      SZ: {item.size} | {item.quantity} Ps
                    </p>
                  </div>

                  <p className="text-xs font-bold text-black">
                    Rp {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* FOOTER TOTAL + CETAK */}
        <div className="p-6 lg:p-8 bg-gray-50 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase text-gray-400 tracking-widest leading-none font-bold">Total Nota</span>
            <span className="text-xl lg:text-2xl text-red-600 tracking-tighter leading-none font-bold">
              Rp {Number(selectedTx.total).toLocaleString()}
            </span>
          </div>
          <button
            onClick={handlePrint}
            className="w-full py-4 bg-black text-white rounded-2xl text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Printer size={16} /> Cetak Resi
          </button>
        </div>
      </div>
    </div>
  )
}