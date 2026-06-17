export interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  phone: string
  password_hash: string
  role: 'super_admin' | 'manager' | 'employee'
  branch_id: string | null
  created_at: string
}

export interface Shift {
  id: string
  branch_id: string
  name: string
  start_time: string
  end_time: string
  is_overnight: boolean
  grace_period_minutes: number
  early_leave_minutes: number
  is_active: boolean
  created_at: string
}

export interface Employee {
  id: string
  user_id: string | null
  branch_id: string
  employee_code: string
  full_name: string
  type: 'fulltime' | 'parttime'
  department: string | null
  position: string | null
  base_salary: number
  allowance: number
  join_date: string
  status: 'active' | 'inactive' | 'terminated' | 'probation'
  avatar_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
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
}

export interface QrToken {
  id: string
  shift_id: string
  branch_id: string
  date: string
  token: string
  expires_at: string
  is_active: boolean
  created_at: string
}

export interface ShiftSchedule {
  id: string
  employee_id: string
  shift_id: string
  date: string
  is_override: boolean
  created_by: string | null
  created_at: string
}

export interface EmployeeShiftAssignment {
  id: string
  employee_id: string
  shift_id: string
  month: number
  year: number
  created_at: string
}

export interface ShiftChangeRequest {
  id: string
  employee_id: string
  from_shift_id: string
  to_shift_id: string
  date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  review_reason: string | null
  created_at: string
  updated_at: string
}
