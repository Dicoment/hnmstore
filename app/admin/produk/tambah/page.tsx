'use client'

import { useState, useEffect } from "react"
import Image from "next/image"
import { 
  Upload, Plus, Trash2, Send, Image as ImageIcon, Loader2, X, Search, CheckCircle2, PackagePlus
} from "lucide-react"

interface Brand { id: string; name: string }
interface Model { id: string; name: string }
interface Size { id: string; value: string }
interface ProductSizeStock { sizeId: string; stock: number | '' }

export default function TambahProdukPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([]) 

  const [name, setName] = useState('') 
  const [description, setDescription] = useState('')
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [priceRegular, setPriceRegular] = useState<number | ''>('')
  const [pricePromo, setPricePromo] = useState<number | ''>('')
  
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [sizeStocks, setSizeStocks] = useState<ProductSizeStock[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showMediaModal, setShowMediaModal] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    const query = (table: string) => JSON.stringify({ sql: `SELECT * FROM public."${table}" ORDER BY name ASC` })
    try {
      const [bRes, mRes, sRes, imgRes] = await Promise.all([
        fetch('/api/vps-db', { method: 'POST', body: query('Brand') }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: query('Model') }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT * FROM public."Size" ORDER BY value ASC` }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT unnest(images) as url FROM public."Product" LIMIT 100` }) }).then(r => r.json())
      ])

      setBrands(bRes.data || [])
      setModels(mRes.data || [])
      setSizes(sRes.data || [])
      const uniqueImgs: string[] = Array.from(new Set((imgRes.data || []).map((i: any) => i.url)))
      setExistingImages(uniqueImgs)
    } catch (err) {
      console.error("Gagal load data:", err)
    }
  }

  const handleUpload = async (files: File[]) => {
    setLoading(true);
    try {
      const uploadedUrls: string[] = []; 
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'products');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) uploadedUrls.push(data.url);
      }
      setImageUrls(prev => [...prev, ...uploadedUrls]);
    } catch (err) {
      alert("Gagal upload!");
    } finally {
      setLoading(false);
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); 
    setIsDragging(false)
    if (e.dataTransfer.files) handleUpload(Array.from(e.dataTransfer.files))
  }

  function createSlug(text: string) {
    return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
  }

  async function handleSubmit(draft = false) {
    if (!name || !brandId || !modelId || !priceRegular) {
      alert('Lengkapi Nama, Brand, Model, dan Harga dulu!')
      return
    }
    setLoading(true)

    try {
      const productQuery = `
        INSERT INTO public."Product" 
        (name, slug, description, "brandId", "modelId", price, price_regular, price_promo, images, draft)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const params = [
        name, createSlug(name), description, brandId, modelId, 
        Number(priceRegular), Number(priceRegular), 
        pricePromo ? Number(pricePromo) : null,
        imageUrls, draft
      ]

      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql: productQuery, params })
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      const productId = result.data[0].id

      if (productId && sizeStocks.length > 0) {
        for (const ss of sizeStocks) {
          if (ss.sizeId && ss.stock !== '') {
            await fetch('/api/vps-db', {
              method: 'POST',
              body: JSON.stringify({
                sql: `INSERT INTO public."ProductSizeStock" ("productId", "sizeId", stock) VALUES ($1, $2, $3)`,
                params: [productId, ss.sizeId, Number(ss.stock)]
              })
            })
          }
        }
      }

      alert(draft ? 'Draft tersimpan!' : 'Produk On-Air!')
      window.location.href = '/admin/produk'
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen font-sans text-black bg-[#FBFBFB]">
      
      {/* MEDIA MODAL */}
      {showMediaModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowMediaModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-black uppercase   tracking-tighter text-lg">Gudang Media VPS</h3>
              <button onClick={() => setShowMediaModal(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 bg-gray-50">
              {existingImages.map((url, i) => (
                <div 
                  key={i} 
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all duration-300 ${imageUrls.includes(url) ? 'border-black scale-95' : 'border-transparent hover:border-gray-300'}`}
                  onClick={() => imageUrls.includes(url) ? setImageUrls(imageUrls.filter(u => u !== url)) : setImageUrls([...imageUrls, url])}
                >
                  <Image src={url} fill className="object-cover" alt="m" unoptimized />
                  {imageUrls.includes(url) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in zoom-in">
                      <CheckCircle2 className="text-white" size={32} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black   uppercase flex items-center gap-3 tracking-tighter">
              <PackagePlus size={28} className="text-black" /> Produk Baru
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Tambahkan Produk Baru</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={() => handleSubmit(true)} disabled={loading} className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">DRAFT</button>
            <button onClick={() => handleSubmit(false)} disabled={loading} className="flex-1 sm:flex-none px-10 py-3 bg-black text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-800 transition-all active:scale-95">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} TERBITKAN
            </button>
          </div>
        </div>
      </div>

      {/* MAIN FORM */}
      <div className="flex-1 p-4 sm:p-10">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
          
          {/* KIRI: INFO DASAR */}
          <div className="flex-1 space-y-10">
            {/* DRAG & DROP AREA */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest  ">Product Gallery</label>
                <button onClick={() => setShowMediaModal(true)} className="text-xs font-black text-blue-600 border-b-2 border-blue-600 pb-0.5 hover:text-black hover:border-black transition-all uppercase">Buka Media</button>
              </div>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-2 border-dashed rounded-xl transition-all duration-500 ${isDragging ? 'border-black bg-zinc-100 scale-[1.01]' : 'border-gray-200 bg-white'}`}
              >
                {imageUrls.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-100 group shadow-md transition-transform hover:scale-105">
                    <Image src={src} fill className="object-cover" alt="preview" unoptimized />
                    <button onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-black text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-gray-100 rounded-xl cursor-pointer hover:bg-zinc-50 bg-white group transition-all">
                  <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
                    <Upload size={24} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-black uppercase mt-3 tracking-widest group-hover:text-black">Upload File</span>
                  <input type="file" multiple onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1  ">Nama Sepatu</label>
                <input type="text" placeholder="Masukkan Nama Produk..." value={name} onChange={e => setName(e.target.value)} className="w-full border-b-2 border-gray-100 focus:border-black py-4 outline-none font-black text-2xl bg-transparent uppercase transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase px-1">Brand</label>
                  <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-xl px-4 py-4 font-black text-xs uppercase outline-none transition-all cursor-pointer">
                    <option value="">Pilih Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase px-1">Model / Kategori</label>
                  <select value={modelId} onChange={e => setModelId(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-xl px-4 py-4 font-black text-xs uppercase outline-none transition-all cursor-pointer">
                    <option value="">Pilih Model</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1  ">Deskripsi Produk</label>
                <textarea rows={5} placeholder="Tulis spesifikasi atau detail produk di sini..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-xl p-5 outline-none font-medium text-sm text-gray-700 transition-all resize-none" />
              </div>
            </div>
          </div>

          {/* KANAN: PRICING & INVENTORY */}
          <div className="lg:w-96 space-y-8">
            
            {/* PRICING CARD */}
            <div className="p-8 bg-black text-white rounded-xl shadow-2xl space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                <ImageIcon size={100} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em]   border-b border-white/20 pb-4">Harga</h3>
              
              <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Regular Price</label>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-xl text-zinc-600">Rp</span>
                    <input type="number" value={priceRegular} onChange={e => setPriceRegular(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-2 pl-10 outline-none font-black text-2xl" placeholder="0" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-red-500 uppercase  ">Sale Price (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-xl text-red-900">Rp</span>
                    <input type="number" value={pricePromo} onChange={e => setPricePromo(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-red-600 py-2 pl-10 outline-none font-black text-2xl text-red-500" placeholder="0" />
                  </div>
                </div>
              </div>
            </div>

            {/* INVENTORY CARD */}
            <div className="p-8 bg-white border border-gray-100 rounded-xl shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest  ">Stock & Size</h3>
                <button type="button" onClick={() => setSizeStocks([...sizeStocks, { sizeId: '', stock: '' }])} className="bg-black text-white p-2 rounded-lg hover:scale-110 active:scale-90 transition-all shadow-lg"><Plus size={18} /></button>
              </div>
              
              <div className="space-y-4">
                {sizeStocks.map((ss, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in zoom-in duration-300">
                    <select value={ss.sizeId} onChange={e => {
                      const n = [...sizeStocks]; n[idx].sizeId = e.target.value; setSizeStocks(n);
                    }} className="flex-1 bg-white border-2 border-transparent focus:border-black rounded-lg px-3 py-2.5 font-black text-xs text-black outline-none shadow-sm appearance-none">
                      <option value="">SIZE</option>
                      {sizes.map(s => <option key={s.id} value={s.id}>{s.value}</option>)}
                    </select>
                    <input type="number" placeholder="QTY" value={ss.stock} onChange={e => {
                      const n = [...sizeStocks]; n[idx].stock = e.target.value === '' ? '' : Number(e.target.value); setSizeStocks(n);
                    }} className="w-20 bg-white border-2 border-transparent focus:border-black rounded-lg px-3 py-2.5 font-black text-xs text-black outline-none shadow-sm" />
                    <button type="button" onClick={() => setSizeStocks(sizeStocks.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors"><X size={20}/></button>
                  </div>
                ))}
                
                {sizeStocks.length === 0 && (
                  <div className="text-center py-10 border-2 border-dotted border-gray-100 rounded-xl">
                    <p className="text-[11px] text-gray-300 font-black uppercase tracking-widest   leading-relaxed">Pencet Tombol + <br/> Buat Tambah Stok Size</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}