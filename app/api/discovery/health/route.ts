import { NextResponse } from 'next/server';
import { getVectorStore } from '@/lib/rag/vector-store';

export async function GET() {
  try {
    const vs = getVectorStore();
    const count = await vs.count();
    return NextResponse.json({ ok: true, indexed: count });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
