import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { CheckinPayload, CheckinResponse } from '../types'

export function useCheckin() {
  return useMutation({
    mutationFn: async (payload: CheckinPayload) => {
      const { data, error } = await supabase.functions.invoke('checkin', {
        body: payload,
      })
      if (error) throw error
      return data as CheckinResponse
    },
  })
}

export function useEmployeeId() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['employee-by-user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return (data as { id: string }).id
    },
    enabled: !!user?.id && user?.role === 'employee',
  })
}
