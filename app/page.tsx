import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: product } = await supabase
    .from('Product')
    .select('*')

  return (
    <div>
      <h1>Daftar Produk</h1>
      <pre>{JSON.stringify(product, null, 2)}</pre>
    </div>
  )
}