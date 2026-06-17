import { supabase } from './supabase'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface AuthUser {
  id: string
  role: 'super_admin' | 'manager' | 'employee'
  branch_id: string | null
  phone: string
}

export async function loginWithPhone(phone: string, password: string): Promise<AuthUser> {
  const hash = await hashPassword(password)

  const { data, error } = await supabase
    .from('users')
    .select('id, role, branch_id, phone')
    .eq('phone', phone.trim())
    .eq('password_hash', hash)
    .single()

  if (error || !data) {
    throw new Error('Invalid phone number or password')
  }

  return data as AuthUser
}

export async function createUserWithPhone(
  phone: string,
  password: string,
  role: AuthUser['role'],
  branchId: string
): Promise<string> {
  const hash = await hashPassword(password)

  const { data, error } = await supabase
    .from('users')
    .insert({ phone: phone.trim(), password_hash: hash, role, branch_id: branchId })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('This phone number is already registered')
    throw new Error(error.message)
  }

  return data.id as string
}

export async function signUp(params: {
  fullName: string
  phone: string
  password: string
  branchId: string
}): Promise<AuthUser> {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', params.phone)
    .maybeSingle()
  if (existing) throw new Error('Phone number already registered')

  const passwordHash = await hashPassword(params.password)
  const userId = crypto.randomUUID()
  const today = new Date().toISOString().split('T')[0]

  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    phone: params.phone.trim(),
    password_hash: passwordHash,
    role: 'employee',
    branch_id: params.branchId,
  })
  if (userError) throw userError

  const { error: empError } = await supabase.from('employees').insert({
    user_id: userId,
    branch_id: params.branchId,
    full_name: params.fullName.trim(),
    type: 'fulltime',
    base_salary: 1,
    allowance: 0,
    join_date: today,
    status: 'active',
  })

  if (empError) {
    await supabase.from('users').delete().eq('id', userId)
    throw new Error(empError.message)
  }

  return { id: userId, role: 'employee', branch_id: params.branchId, phone: params.phone.trim() }
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword)
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}
