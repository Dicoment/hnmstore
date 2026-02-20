import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Kita pake Pool biar koneksi gak gampang putus/timeout
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Tambahan biar aman di environment serverless Next.js
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function POST(req: NextRequest) {
  try {
    const { sql, params } = await req.json();

    // Validasi dasar biar gak kosong banget
    if (!sql) {
      return NextResponse.json({ error: 'Query SQL kosong!' }, { status: 400 });
    }

    // Eksekusi query ke VPS
    const result = await pool.query(sql, params || []);

    return NextResponse.json({
      data: result.rows,
      rowCount: result.rowCount,
      error: null
    });

  } catch (err: any) {
    console.error('❌ VPS DB Error:', err.message);
    return NextResponse.json({
      data: [],
      error: err.message
    }, { status: 500 });
  }
}