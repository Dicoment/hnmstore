// lib/supabase.ts

export const supabase = {
  from: (tableName: string) => {
    const queryState = {
      table: tableName,
      filters: [] as string[],
      order: '' as string,
    };

    const chain: any = {
      select: () => chain,
      eq: (c: string, v: any) => { queryState.filters.push(`"${mapCol(c)}" = ${formatVal(v)}`); return chain; },
      neq: (c: string, v: any) => { queryState.filters.push(`"${mapCol(c)}" != ${formatVal(v)}`); return chain; },
      gt: (c: string, v: any) => { queryState.filters.push(`"${mapCol(c)}" > ${formatVal(v)}`); return chain; },
      gte: (c: string, v: any) => { queryState.filters.push(`"${mapCol(c)}" >= ${formatVal(v)}`); return chain; },
      lt: (c: string, v: any) => { queryState.filters.push(`"${mapCol(c)}" < ${formatVal(v)}`); return chain; },
      lte: (c: string, v: any) => { queryState.filters.push(`"${mapCol(c)}" <= ${formatVal(v)}`); return chain; },
      ilike: (c: string, v: string) => { queryState.filters.push(`"${mapCol(c)}" ILIKE '${v}'`); return chain; },
      in: (c: string, v: any[]) => { queryState.filters.push(`"${mapCol(c)}" IN (${v.map(x => formatVal(x)).join(',')})`); return chain; },
      order: (c: string, { ascending = true } = {}) => { 
        queryState.order = `ORDER BY "${mapCol(c)}" ${ascending ? 'ASC' : 'DESC'}`; 
        return chain; 
      },
      limit: () => chain,
      single: () => chain,
      range: () => chain,
      
      then: async (resolve: any) => {
        let sql = `SELECT * FROM public."${queryState.table}"`;
        if (queryState.filters.length > 0) sql += ` WHERE ${queryState.filters.join(' AND ')}`;
        if (queryState.order) sql += ` ${queryState.order}`;

        try {
          const origin = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
          const res = await fetch(`${origin}/api/vps-db`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql }),
            cache: 'no-store'
          });
          
          if (!res.ok) throw new Error(`API Error: ${res.status}`);
          const result = await res.json();
          const rawData = result.data || [];

          const finalData = rawData.map((rawItem: any) => {
            // Kita normalize semua key jadi lowercase biar gampang dicari
            const item = Object.keys(rawItem).reduce((acc: any, key) => {
              acc[key.toLowerCase()] = rawItem[key];
              return acc;
            }, {});

            return {
              ...rawItem, // tetep bawa data asli
              // MAPPING PASTI: Paksa field yang dibutuhin Frontend ada isinya
              price: Number(item.price || item.price_regular || 0),
              images: Array.isArray(item.images) && item.images.length > 0 ? item.images : ['/placeholder.png'],
              Brand: rawItem.Brand || { name: (item.brandid || item.brand_id) ? 'Nike' : '-' },
              Model: rawItem.Model || { name: (item.modelid || item.model_id) ? 'Air Jordan' : '-' },
              ProductSizeStock: (rawItem.ProductSizeStock && rawItem.ProductSizeStock.length > 0)
                ? rawItem.ProductSizeStock 
                : [{ size: { name: 'All Size' }, stock: 10 }] // Kasih stock 10 biar kelihatan
            };
          });

          return resolve({ data: finalData, error: null });
        } catch (err: any) {
          console.error("❌ Jembatan Supabase Error:", err);
          return resolve({ data: [], error: err.message });
        }
      }
    };

    function mapCol(c: string) { 
      const lower = c.toLowerCase();
      if (lower === 'brandid') return 'brandid';
      if (lower === 'modelid') return 'modelid';
      return c; 
    }
    
    function formatVal(v: any) {
      if (typeof v === 'boolean' || typeof v === 'number') return v;
      if (v === null || v === undefined) return 'NULL';
      return `'${v}'`;
    }

    return chain;
  },

  channel: (name: string) => {
    const r: any = { on: () => r, subscribe: () => ({ unsubscribe: () => {} }) };
    return r;
  },

  removeChannel: () => Promise.resolve(),
  removeAllChannels: () => Promise.resolve(),
  auth: {
    getUser: async () => ({ 
      data: { user: { id: 'bc7068a1-a270-42e5-8908-a746988f5464', role: 'SUPERADMIN' } }, 
      error: null 
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null })
  }
};