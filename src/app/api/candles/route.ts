import { NextResponse, type NextRequest } from 'next/server';
import { getCandles } from '@/lib/market';
import { isSymbolId, isTimeframe } from '@/lib/types';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const tf = req.nextUrl.searchParams.get('tf');
  if (!isSymbolId(symbol) || !isTimeframe(tf)) {
    return NextResponse.json({ error: 'Unknown symbol or timeframe' }, { status: 400 });
  }
  try {
    const candles = await getCandles(symbol, tf);
    return NextResponse.json({ candles }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('candles', symbol, tf, err);
    return NextResponse.json({ error: 'Market data feed unavailable. Try again shortly.' }, { status: 502 });
  }
}
