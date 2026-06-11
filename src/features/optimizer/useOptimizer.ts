import { useMutation, useQuery } from '@tanstack/react-query'
import { productsApi } from 'src/features/products/productsApi'
import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import { optimizerApi } from './optimizerApi'

export const useOptimize = () =>
  useMutation({
    mutationFn: optimizerApi.optimize,
  })

// Tableros del catálogo (productos type=board). `select` los estrecha a BoardProduct[].
export const useBoards = () =>
  useQuery({
    queryKey: ['boards'],
    queryFn: () => productsApi.list({ type: 'board', limit: 100 }),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.items.filter((p): p is BoardProduct => p.type === 'board'),
  })

// Tapacantos del catálogo (productos type=edge_banding).
export const useEdgeBandings = () =>
  useQuery({
    queryKey: ['edge-bandings'],
    queryFn: () => productsApi.list({ type: 'edge_banding', limit: 100 }),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.items.filter((p): p is EdgeBandingProduct => p.type === 'edge_banding'),
  })
