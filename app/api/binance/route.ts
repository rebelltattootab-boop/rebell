import { NextResponse } from 'next/server'

export const revalidate = 300 // cache the P2P rate for 5 minutes

// Queries Binance's public P2P search for USDT/VES SELL ads and returns the
// median advertised price — a solid proxy for the "dolar Binance" street rate.
// Proxied server-side to dodge CORS and keep the client simple.
export async function GET() {
  try {
    const res = await fetch(
      'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          asset: 'USDT',
          fiat: 'VES',
          tradeType: 'SELL',
          page: 1,
          rows: 15,
          payTypes: [],
          publisherType: null,
        }),
        next: { revalidate: 300 },
      },
    )

    if (!res.ok) throw new Error(`Upstream responded with ${res.status}`)

    const json = await res.json()
    const prices: number[] = (json?.data ?? [])
      .map((d: { adv?: { price?: string } }) => Number(d?.adv?.price))
      .filter((n: number) => Number.isFinite(n) && n > 0)

    if (prices.length === 0) throw new Error('No P2P ads returned')

    prices.sort((a, b) => a - b)
    const mid = Math.floor(prices.length / 2)
    const median =
      prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid]

    return NextResponse.json({
      rate: Number(median.toFixed(2)),
      updatedAt: new Date().toISOString(),
      source: 'Binance',
    })
  } catch (error) {
    console.log('[v0] Binance P2P fetch failed:', (error as Error).message)
    return NextResponse.json(
      { error: 'No se pudo obtener la tasa Binance P2P' },
      { status: 502 },
    )
  }
}
