import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Shift } from '@/types/database'
import type { ShiftFormValues } from '../types'

export function useShifts() {
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useQuery({
    queryKey: ['shifts', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('branch_id', branchId)
        .order('start_time')
      if (error) throw error
      return (data ?? []) as Shift[]
    },
    enabled: !!branchId,
  })
}

export function useShift(id: string) {
  return useQuery({
    queryKey: ['shift', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Shift
    },
    enabled: !!id,
  })
}

export function useUpsertShift() {
  const qc = useQueryClient()
  const adminUserId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async ({ id, ...values }: ShiftFormValues & { id?: string; branch_id?: string }) => {
      if (id) {
        const { error } = await supabase.from('shifts').update(values).eq('id', id)
        if (error) throw error
        await supabase.from('audit_logs').insert({
          branch_id: branchId,
          user_id: adminUserId,
          action: 'shift_updated',
          table_name: 'shifts',
          target_type: 'shift',
          target_id: id,
          details: { name: values.name },
        })
      } else {
        const { data, error } = await supabase
          .from('shifts')
          .insert({ ...values, branch_id: values.branch_id ?? branchId })
          .select('id')
          .single()
        if (error) throw error
        await supabase.from('audit_logs').insert({
          branch_id: branchId,
          user_id: adminUserId,
          action: 'shift_created',
          table_name: 'shifts',
          target_type: 'shift',
          target_id: data.id,
          details: { name: values.name },
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Shift saved')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to save shift')
    },
  })
}

export function useDeleteShift() {
  const qc = useQueryClient()
  const adminUserId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async (shift: Shift) => {
      const { error } = await supabase.from('shifts').delete().eq('id', shift.id)
      if (error) throw error
      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: adminUserId,
        action: 'shift_deleted',
        table_name: 'shifts',
        target_type: 'shift',
        target_id: shift.id,
        details: { name: shift.name },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Shift deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete shift')
    },
  })
}
