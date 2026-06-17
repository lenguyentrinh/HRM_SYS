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
