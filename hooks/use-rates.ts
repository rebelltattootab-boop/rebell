'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import type { RateSource } from '@/lib/types'

type RateResponse = { rate: number; updatedAt: string | null; source: string }

const fetcher = async (url: string): Promise<RateResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al obtener la tasa')
  return res.json()
}

const MANUAL_KEY = 'rt-manual-rates'

type ManualRates = { BCV?: number; Binance?: number }

export type RatesValue = {
  bcv: number | null
  binance: number | null
  bcvAuto: number | null
  binanceAuto: number | null
  spread: number | null // percentage difference (Binance over BCV)
  isLoading: boolean
  bcvError: boolean
  binanceError: boolean
  manual: ManualRates
  setManual: (source: RateSource, value: number | null) => void
  refresh: () => void
  rateFor: (source: RateSource) => number | null
}

// Fetches BCV and Binance P2P rates in parallel and layers optional manual
// overrides on top (persisted locally) so the register keeps working offline.
export function useRates(): RatesValue {
  const bcv = useSWR<RateResponse>('/api/bcv', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 1000 * 60 * 30,
  })
  const binance = useSWR<RateResponse>('/api/binance', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 1000 * 60 * 10,
  })

  const [manual, setManualState] = useState<ManualRates>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_KEY)
      if (raw) setManualState(JSON.parse(raw))
    } catch {
      // ignore malformed storage
    }
  }, [])

  const setManual = useCallback((source: RateSource, value: number | null) => {
    setManualState((prev) => {
      const next = { ...prev }
      if (value && Number.isFinite(value) && value > 0) next[source] = value
      else delete next[source]
      localStorage.setItem(MANUAL_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const refresh = useCallback(() => {
    bcv.mutate()
    binance.mutate()
  }, [bcv, binance])

  const bcvAuto = bcv.data?.rate ?? null
  const binanceAuto = binance.data?.rate ?? null
  const bcvRate = manual.BCV ?? bcvAuto
  const binanceRate = manual.Binance ?? binanceAuto

  const spread =
    bcvRate && binanceRate ? ((binanceRate - bcvRate) / bcvRate) * 100 : null

  const rateFor = useCallback(
    (source: RateSource) => (source === 'BCV' ? bcvRate : binanceRate),
    [bcvRate, binanceRate],
  )

  return {
    bcv: bcvRate,
    binance: binanceRate,
    bcvAuto,
    binanceAuto,
    spread,
    isLoading: bcv.isLoading || binance.isLoading,
    bcvError: !!bcv.error,
    binanceError: !!binance.error,
    manual,
    setManual,
    refresh,
    rateFor,
  }
}
