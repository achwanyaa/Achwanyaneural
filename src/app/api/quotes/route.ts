import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/market';
import { SYMBOL_IDS, type Quote } from '@/lib/types';

export async function GET() {
  const results = await Promise.allSettled(SYMBOL_IDS.map((s) => getQuote(s)));
  const quotes: Quote[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') quotes.push(r.value);
    else console.error('quote', SYMBOL_IDS[i], r.reason);
  });
  return NextResponse.json({ quotes }, { headers: { 'Cache-Control': 'no-store' } });
}
