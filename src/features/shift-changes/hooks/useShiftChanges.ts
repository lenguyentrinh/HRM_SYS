import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ShiftChangeRequestWithJoins } from '../types'

export function useShiftChangeRequests(status?: string) {
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useQuery({
    queryKey: ['shift-change-requests', branchId, status ?? 'all'],
    queryFn: async () => {
      if (!branchId) return []
      let query = supabase
        .from('shift_change_requests')
        .select('*, employees!inner(full_name, employee_code), from_shift:shifts!from_shift_id(name, start_time, end_time), to_shift:shifts!to_shift_id(name, start_time, end_time)')
        .eq('employees.branch_id', branchId)
        .order('created_at', { ascending: false })

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ShiftChangeRequestWithJoins[]
    },
    enabled: !!branchId,
  })
}

export function useReviewShiftChange() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewReason,
    }: {
      id: string
      status: 'approved' | 'rejected'
      reviewReason?: string
    }) => {
      const { error } = await supabase
        .from('shift_change_requests')
        .update({
          status,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_reason: reviewReason ?? null,
        })
        .eq('id', id)
      if (error) throw error

      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: userId,
        action: `shift_change_${status}`,
        table_name: 'shift_change_requests',
        target_type: 'shift_change_request',
        target_id: id,
        details: { status, review_reason: reviewReason },
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['shift-change-requests'] })
      toast.success(`Request ${vars.status === 'approved' ? 'approved' : 'rejected'}`)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to review request'),
  })
}

export function useMyShiftChangeRequests() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['my-shift-change-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('shift_change_requests')
        .select('*, employees!inner(full_name, employee_code), from_shift:shifts!from_shift_id(name, start_time, end_time), to_shift:shifts!to_shift_id(name, start_time, end_time)')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ShiftChangeRequestWithJoins[]
    },
    enabled: !!user?.id,
  })
}

export function useCreateShiftChange() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async ({
      from_shift_id,
      to_shift_id,
      date,
      reason,
    }: {
      from_shift_id: string
      to_shift_id: string
      date: string
      reason?: string
    }) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('shift_change_requests')
        .insert({
          employee_id: user.id,
          from_shift_id,
          to_shift_id,
          date,
          reason: reason ?? null,
          status: 'pending',
        })
        .select('id')
        .single()
      if (error) throw error

      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: user.id,
        action: 'shift_change_created',
        table_name: 'shift_change_requests',
        target_type: 'shift_change_request',
        target_id: data.id,
        details: { from_shift_id, to_shift_id, date },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-shift-change-requests'] })
      toast.success('Shift change request submitted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to submit request'),
  })
}
