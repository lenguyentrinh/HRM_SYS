import { z } from 'zod'

export const attendanceFiltersSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  shift_id: z.string().optional(),
  status: z.string().optional(),
})

export const manualAttendanceSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  shift_id: z.string().min(1, 'Shift is required'),
  date: z.string().min(1, 'Date is required'),
  check_in_at: z.string().optional(),
  check_out_at: z.string().optional(),
  status: z.enum(['present', 'late', 'absent', 'leave', 'holiday']).default('present'),
  notes: z.string().optional(),
  source: z.enum(['qr', 'link', 'manual']).default('manual'),
})

export type AttendanceFilters = z.infer<typeof attendanceFiltersSchema>
export type ManualAttendanceValues = z.infer<typeof manualAttendanceSchema>

export interface AttendanceRecordJoined {
  id: string
  employee_id: string
  shift_id: string
  date: string
  check_in_at: string | null
  check_out_at: string | null
  check_in_source: 'qr' | 'link' | 'manual' | null
  check_out_source: 'qr' | 'link' | 'manual' | null
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday'
  late_minutes: number | null
  early_leave_minutes: number | null
  overtime_minutes: number | null
  is_holiday: boolean
  notes: string | null
  created_by: string | null
  leave_request_id: string | null
  created_at: string
  updated_at: string
  employees: {
    full_name: string
    employee_code: string
  }
  shifts: {
    name: string
    start_time: string
    end_time: string
  }
}
