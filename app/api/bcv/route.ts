import { NextResponse } from 'next/server'

export const revalidate = 3600 // cache the rate for an hour

// Proxies the public dolarapi.com (Venezuela) API server-side to avoid any
// client-side CORS issues, and normalizes it to a simple { rate, updatedAt } shape.
export async function GET() {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`Upstream responded with ${res.status}`)
    }

    const data = await res.json()
    // The API returns { fuente, nombre, promedio, fechaActualizacion, ... }
    const rate = Number(data?.promedio)

    if (!rate || Number.isNaN(rate)) {
      throw new Error('Could not parse BCV rate from upstream')
    }

    return NextResponse.json({
      rate,
      updatedAt: data?.fechaActualizacion ?? null,
      source: 'BCV',
    })
  } catch (error) {
    console.log('[v0] BCV fetch failed:', (error as Error).message)
    return NextResponse.json(
      { error: 'No se pudo obtener la tasa BCV' },
      { status: 502 },
    )
  }
}
