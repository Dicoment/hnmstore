'use client'

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { 
  Upload, Plus, Trash2, Send, Loader2, X, CheckCircle2, PackagePlus, FolderOpen
} from "lucide-react"
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import { uploadImage } from '@/lib/upload'
import ProductTypeSelect from '@/components/admin/ProductTypeSelect'
import { DEFAULT_PRODUCT_TYPE, sortSizes } from '@/lib/product-types'

interface Brand { id: string; name: string }
interface Model { id: string; name: string }
interface Size { id: string; value: string }
interface ProductSizeStock { sizeId: string; stock: number | '' }

export default function TambahProdukPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [existingImages, setExistingImages] = useState<any[]>([]) 

  const [name, setName] = useState('') 
  const [productType, setProductType] = useState<string>(DEFAULT_PRODUCT_TYPE)
  const [description, setDescription] = useState('')
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [priceRegular, setPriceRegular] = useState<number | ''>('')
  const [pricePromo, setPricePromo] = useState<number | ''>('')
  
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [sizeStocks, setSizeStocks] = useState<ProductSizeStock[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showMediaModal, setShowMediaModal] = useState(false)

  const fetchInitialData = useCallback(async () => {
    try {
      const [bRes, mRes, sRes, imgRes] = await Promise.all([
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT * FROM public."Brand" ORDER BY name ASC` }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT * FROM public."Model" ORDER BY name ASC` }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT * FROM public."Size" ORDER BY value ASC` }) }).then(r => r.json()),
        fetch('/api/media').then(r => r.json())
      ])
      setBrands(bRes.data || []); setModels(mRes.data || []); setSizes(sRes.data || []); setExistingImages(imgRes.data || []);
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchInitialData() }, [fetchInitialData])

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      const uploadedNames: string[] = []; 
      for (const file of files) {
        try { uploadedNames.push(await uploadImage(file, name)); }
        catch (e: any) { alert(e.message); }
      }
      setImageUrls(prev => [...prev, ...uploadedNames]);
      fetchInitialData();
    } catch (err) { alert("Upload gagal!"); } finally { setUploading(false); }
  }

  // --- LOGIC WP SLUG ASLI LU (TETAP SAMA) ---
  async function generateWPSlug(productName: string) {
    const baseSlug = productName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
    const checkSlugRes = await fetch('/api/vps-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sql: `SELECT slug FROM public."Product" WHERE slug = $1 OR slug LIKE $2 ORDER BY length(slug) DESC, slug DESC`, 
        params: [baseSlug, `${baseSlug}-%`] 
      })
    });
    const checkData = await checkSlugRes.json();
    if (checkData.data && checkData.data.length > 0) {
      const count = checkData.data.length + 1;
      return `${baseSlug}-${count}`;
    }
    return baseSlug;
  }

  async function handleSubmit(draft = false) {
    if (!name || !brandId || !modelId || !priceRegular) return alert('Lengkapi data!');
    setLoading(true);
    try {
      const finalSlug = await generateWPSlug(name);
      const validSizeStocks = sizeStocks.filter(s => s.sizeId && s.stock !== '');
      const combinedQuery = `
        WITH new_product AS (
          INSERT INTO public."Product" (name, slug, description, "brandId", "modelId", price, price_regular, price_promo, images, draft, type, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $13, NOW()) RETURNING id
        )
        INSERT INTO public."ProductSizeStock" ("productId", "sizeId", stock)
        SELECT (SELECT id FROM new_product), unnest($11::uuid[]), unnest($12::int[]);
      `;
      const params = [
        name, finalSlug, description, brandId, modelId, 
        Number(priceRegular), Number(priceRegular), pricePromo ? Number(pricePromo) : null, 
        imageUrls, draft, validSizeStocks.map(s => s.sizeId), validSizeStocks.map(s => Number(s.stock)), productType
      ];
      const res = await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: combinedQuery, params }) });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      alert(draft ? 'Draft disimpan!' : 'Produk Terbit!');
      window.location.href = '/admin/produk';
    } catch (err: any) { alert('Gagal: ' + err.message); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans w-full pb-32">
      {/* HEADER NAV - RESPONSIVE PADDING */}
      <div className="w-full bg-white border-b border-gray-100 px-4 lg:px-10 py-6 flex flex-col md:flex-row justify-between items-center sticky top-10 z-40 gap-4">
        <div className="flex gap-3 w-full md:w-auto text-black">
          <button onClick={() => handleSubmit(true)} disabled={loading} className="flex-1 md:flex-none px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all text-black">DRAFT</button>
          <button onClick={() => handleSubmit(false)} disabled={loading} className="flex-1 md:flex-none px-8 py-3 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} TERBITKAN
          </button>
        </div>
      </div>

      <div className="px-2 lg:px-10 py-4 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        <div className="lg:col-span-8 space-y-6 lg:space-y-10 order-2 lg:order-1">
          
          {/* GALLERY SECTION - RAPI & GRID FIX */}
          <div className="bg-white p-6 lg:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gallery Assets</label>
              <div className="flex gap-2 w-full sm:w-auto">
                <label className="flex-1 sm:flex-none cursor-pointer px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl font-bold text-[12px] uppercase flex items-center justify-center gap-2 transition-all">
                  <Upload size={14} /> UPLOAD <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))} />
                </label>
                <button onClick={() => setShowMediaModal(true)} className="flex-1 sm:flex-none px-4 py-3 bg-black text-white rounded-xl font-bold text-[12px] uppercase flex items-center justify-center gap-2 transition-all shadow-md">
                  <FolderOpen size={14} /> MEDIA
                </button>
              </div>
            </div>
            
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleUpload(Array.from(e.dataTransfer.files)) }}
              className={`grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 p-6 border-2 border-dashed rounded-2xl transition-all min-h-60 relative auto-rows-max ${isDragging ? 'border-black bg-gray-50' : 'border-gray-100'}`}>
              
              {imageUrls.length === 0 && !uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Upload size={32} className="text-gray-200 mb-2" />
                  <p className="text-[12px] font-bold text-gray-300 uppercase tracking-widest">Drop assets here</p>
                </div>
              )}

              {imageUrls.map((name, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group shadow-sm bg-white">
                  <Image src={`/uploads/${name}`} fill className="object-cover" alt="p" unoptimized />
                  <button onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 bg-black text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-600"><X size={12} /></button>
                </div>
              ))}
              {uploading && <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100"><Loader2 className="animate-spin text-black" size={20} /></div>}
            </div>
          </div>

          {/* IDENTITY SECTION */}
          <div className="bg-white p-6 lg:p-10 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Title</label>
              <input type="text" placeholder="MISAL: NIKE RUN" value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent border-b-2 border-gray-50 focus:border-black py-4 outline-none font-bold text-xl lg:text-3xl uppercase transition-all text-black" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipe Produk</label>
              <ProductTypeSelect value={productType} onChange={setProductType} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Brand Label</label>
                <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 uppercase outline-none cursor-pointer text-xs font-bold text-black focus:ring-1 focus:ring-black">
                  <option value="">SELECT BRAND</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Model Category</label>
                <select value={modelId} onChange={e => setModelId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 uppercase outline-none cursor-pointer text-xs font-bold text-black focus:ring-1 focus:ring-black">
                  <option value="">SELECT MODEL</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-black">Full Description</label>
              <textarea rows={6} placeholder="Describe product details..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 outline-none font-bold text-[12px] text-black resize-none focus:ring-1 focus:ring-black transition-all" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:space-y-10 order-1 lg:order-2 text-black">
          {/* PRICING SECTION */}
          <div className="bg-white p-6 lg:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 font-bold text-black">
            <h3 className="uppercase tracking-widest border-b border-gray-50 pb-4 text-xs text-black">Price Configuration</h3>
            <div className="space-y-6 text-black">
              <div className="space-y-2">
                <label className="text-gray-400 uppercase tracking-widest text-[10px]">Regular Price (Rp)</label>
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 focus-within:ring-1 focus-within:ring-black transition-all">
                  <input type="number" value={priceRegular} onChange={e => setPriceRegular(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent outline-none font-bold text-xl text-black border-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-red-400 uppercase tracking-widest text-[10px]">Promo Price (Rp)</label>
                <div className="flex items-center gap-3 bg-red-50/30 p-4 rounded-xl border border-red-100 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                  <input type="number" value={pricePromo} onChange={e => setPricePromo(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent outline-none font-bold text-xl text-red-600 border-none" />
                </div>
              </div>
            </div>
          </div>

          {/* STOCK SECTION */}
          <div className="bg-white p-6 lg:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 font-bold text-black">
            <div className="flex justify-between items-center border-b border-gray-50 pb-4 text-black">
              <h3 className="uppercase tracking-widest text-xs text-black font-bold">Inventory Stock</h3>
              <button onClick={() => setSizeStocks([...sizeStocks, { sizeId: '', stock: '' }])} className="bg-black t p-2 rounded-xl shadow-lg active:scale-90 transition-all text-white font-bold"><Plus size={18} /></button>
            </div>
            <div className="space-y-3">
              {sizeStocks.map((ss, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-black transition-all text-black">
                  <select value={ss.sizeId} onChange={e => { const n = [...sizeStocks]; n[idx].sizeId = e.target.value; setSizeStocks(n); }} className="flex-1 bg-white border-none rounded-lg px-3 py-3 uppercase outline-none text-[12px] font-bold text-black cursor-pointer">
                    <option value="">SIZE</option>
                    {sortSizes(sizes, productType).map(s => <option key={s.id} value={s.id}>{s.value}</option>)}
                  </select>
                  <input type="number" placeholder="QTY" value={ss.stock} onChange={e => { const n = [...sizeStocks]; n[idx].stock = e.target.value === '' ? '' : Number(e.target.value); setSizeStocks(n); }} className="w-20 bg-white border-none rounded-lg px-3 py-3 text-center outline-none text-[12px] font-bold text-black" />
                  <button onClick={() => setSizeStocks(sizeStocks.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-colors px-2"><X size={18}/></button>
                </div>
              ))}
              {sizeStocks.length === 0 && <p className="text-[10px] text-gray-300 text-center py-4 font-bold uppercase tracking-widest">No stock added</p>}
            </div>
          </div>
        </div>
      </div>

      {/* LIBRARY GAMBAR */}
      <MediaLibraryModal
        open={showMediaModal}
        files={existingImages}
        selected={imageUrls}
        onToggle={(fileName) => setImageUrls(prev => prev.includes(fileName) ? prev.filter(u => u !== fileName) : [...prev, fileName])}
        onClose={() => setShowMediaModal(false)}
        title="Media Terupload"
      />

      <style jsx global>{`
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}