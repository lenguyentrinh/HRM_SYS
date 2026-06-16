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

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword)
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}
