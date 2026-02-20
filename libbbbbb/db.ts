// lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Pastikan ini ambil dari .env yang baru
  ssl: false // Di VPS lokal biasanya gak pake SSL, beda ama Supabase
});

export const query = (text: string, params?: any[]) => pool.query(text, params);