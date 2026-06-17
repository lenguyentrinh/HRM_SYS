import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { QrToken, Shift, Branch } from '@/types/database'

export function useQrTokens(branchId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['qr-tokens', branchId, date],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('qr_tokens')
        .select('*, shifts:shift_id(name, start_time, end_time)')
        .eq('branch_id', branchId)
        .eq('date', date)
        .eq('is_active', true)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as (QrToken & { shifts: { name: string; start_time: string; end_time: string } })[]
    },
    enabled: !!branchId,
    refetchInterval: 30000,
  })
}

export function useTabletShifts(branchId: string | undefined) {
  return useQuery({
    queryKey: ['tablet-shifts', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('start_time')
      if (error) throw error
      return data as Shift[]
    },
    enabled: !!branchId,
  })
}

export function useBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, address')
        .eq('id', branchId)
        .single()
      if (error) throw error
      return data as Pick<Branch, 'id' | 'name' | 'address'>
    },
    enabled: !!branchId,
  })
}
