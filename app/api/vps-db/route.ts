import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false 
});

export async function POST(req: NextRequest) {
  try {
    const { sql, params } = await req.json();

    if (!sql) {
      return NextResponse.json({ error: 'Query SQL kosong!' }, { status: 400 });
    }

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