'use client'
import { Printer, X } from 'lucide-react'

interface ItemStruk {
  name: string;
  size: string | number;
  quantity: number;
  price: number;
}

interface ModalStrukProps {
  show: boolean;
  onClose: () => void;
  data: {
    id: string;
    customer: string;
    date: string;
    subtotal: number;
    discount: number;
    total: number;
    items: string | ItemStruk[];
  } | null;
}

export default function ModalStruk({ show, onClose, data }: ModalStrukProps) {
  if (!show || !data) return null;

  const handlePrint = () => {
    const content = document.getElementById('printable-receipt-pos')?.innerHTML;
    const win = window.open('', '_blank', 'width=450,height=700');
    if (win && content) {
      win.document.write(`
        <html>
          <head>
            <title>HNM STORE RECEIPT</title>
            <style>
              @media print { @page { size: 80mm auto; margin: 0; } body { margin: 0; padding: 5mm; width: 70mm; } }
              body { font-family: monospace; font-size: 13px; line-height: 1.2; text-transform: uppercase; color: black; background: white; }
              table { width: 100%; border-collapse: collapse; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .border-dash { border-top: 1px dashed black; margin: 8px 0; }
            </style>
          </head>
          <body onload="window.print(); window.close();">${content}</body>
        </html>
      `);
      win.document.close();
    }
  };

  const parsedItems: ItemStruk[] = typeof data.items === 'string' 
    ? JSON.parse(data.items) 
    : data.items;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8 text-black overflow-y-auto">
      <div className="bg-white rounded-3xl p-10 w-full max-w-sm my-auto shadow-2xl">
        <div id="printable-receipt-pos" className="bg-white font-mono text-black">
          <div className="text-center py-4">
            <div className="text-2xl font-bold">HnM Store</div>
            <div className="text-xs opacity-50">#{data.id?.slice(0, 10)}</div>
          </div>
          <div className="border-dash" />
          <div className="py-2 text-xs">
            <div className="flex justify-between"><span>CUST:</span><span>{data.customer}</span></div>
            <div className="flex justify-between"><span>DATE:</span><span>{data.date}</span></div>
          </div>
          <div className="border-dash" />
          <table className="text-xs w-full">
            <tbody>
              {parsedItems.map((it, i) => (
                <tr key={i}>
                  <td className="py-1">{it.name} SZ{it.size} x{it.quantity}</td>
                  <td className="text-right py-1">{(it.price * it.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-dash" />
          <div className="space-y-1 text-xs font-bold">
            <div className="flex justify-between"><span>SUBTOTAL</span><span>{data.subtotal?.toLocaleString()}</span></div>
            <div className="flex justify-between text-red-600"><span>DISCOUNT</span><span>-{data.discount?.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm py-2"><span>TOTAL</span><span>RP {data.total?.toLocaleString()}</span></div>
          </div>
          <div className="border-dash" />
          <div className="text-center text-xs py-4">TERIMA KASIH TELAH BERBELANJA</div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 mt-8">
          <button onClick={handlePrint} className="flex items-center justify-center gap-4 bg-black text-white py-5 rounded-2xl font-bold text-xs uppercase shadow-xl">
            <Printer size={22} /> CETAK STRUK
          </button>
          <button onClick={onClose} className="w-full py-4 text-xs font-bold text-gray-400 uppercase text-center">KEMBALI</button>
        </div>
      </div>
    </div>
  );
}