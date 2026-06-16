import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface EmployeeRow {
  full_name: string
  phone: string
  type: 'fulltime' | 'parttime'
  department?: string
  position?: string
  base_salary: number
  allowance: number
  join_date: string
}

function parseCSV(csv: string): EmployeeRow[] {
  const lines = csv.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  // Skip BOM if present
  const header = lines[0].replace(/^﻿/, '').split(',').map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    header.forEach((h, i) => { row[h] = values[i] ?? '' })

    return {
      full_name: row['ho_ten'] ?? row['full_name'] ?? '',
      phone: row['sdt'] ?? row['phone'] ?? '',
      type: (row['loai'] ?? row['type'] ?? 'fulltime') as 'fulltime' | 'parttime',
      department: row['phong_ban'] ?? row['department'] ?? undefined,
      position: row['chuc_vu'] ?? row['position'] ?? undefined,
      base_salary: Number(row['luong_cb'] ?? row['base_salary'] ?? 0),
      allowance: Number(row['phu_cap'] ?? row['allowance'] ?? 0),
      join_date: row['ngay_vao'] ?? row['join_date'] ?? new Date().toISOString().split('T')[0],
    }
  })
}

function validateRow(row: EmployeeRow, idx: number): string | null {
  if (!row.full_name) return `Hàng ${idx + 2}: Thiếu họ tên`
  if (!row.phone || !/^0\d{9}$/.test(row.phone)) return `Hàng ${idx + 2}: SĐT không hợp lệ (${row.phone})`
  if (!['fulltime', 'parttime'].includes(row.type)) return `Hàng ${idx + 2}: Loại nhân viên phải là fulltime hoặc parttime`
  if (row.base_salary < 0) return `Hàng ${idx + 2}: Lương cơ bản không hợp lệ`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.join_date)) return `Hàng ${idx + 2}: Ngày vào phải định dạng YYYY-MM-DD`
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { csv_content, branch_id } = await req.json() as { csv_content: string; branch_id: string }

    if (!csv_content || !branch_id) {
      return new Response(
        JSON.stringify({ error: 'Missing csv_content or branch_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch branch default password
    const { data: branch } = await supabase
      .from('branches')
      .select('default_employee_password')
      .eq('id', branch_id)
      .single()

    const defaultPassword = branch?.default_employee_password ?? '123456'
    const passwordHash = await hashPassword(defaultPassword)

    const rows = parseCSV(csv_content)
    if (!rows.length) {
      return new Response(
        JSON.stringify({ error: 'Không tìm thấy dữ liệu trong file CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate all rows first
    const errors: string[] = []
    rows.forEach((row, idx) => {
      const err = validateRow(row, idx)
      if (err) errors.push(err)
    })
    if (errors.length) {
      return new Response(
        JSON.stringify({ errors, success: 0 }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate phones in batch
    const phones = rows.map((r) => r.phone)
    const { data: existingUsers } = await supabase
      .from('users')
      .select('phone')
      .in('phone', phones)

    const existingPhones = new Set((existingUsers ?? []).map((u: { phone: string }) => u.phone))
    const duplicates = phones.filter((p) => existingPhones.has(p))
    if (duplicates.length) {
      return new Response(
        JSON.stringify({
          errors: [`SĐT đã tồn tại trong hệ thống: ${duplicates.join(', ')}`],
          success: 0,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate employee codes
    const { data: lastEmp } = await supabase
      .from('employees')
      .select('employee_code')
      .eq('branch_id', branch_id)
      .order('employee_code', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextCode = 1
    if (lastEmp?.employee_code) {
      const match = lastEmp.employee_code.match(/\d+$/)
      if (match) nextCode = Number(match[0]) + 1
    }

    // Insert users then employees
    let successCount = 0
    const importErrors: string[] = []

    for (const row of rows) {
      try {
        const { data: user, error: userErr } = await supabase
          .from('users')
          .insert({ phone: row.phone, password_hash: passwordHash, role: 'employee', branch_id })
          .select('id')
          .single()

        if (userErr) throw new Error(`${row.full_name}: ${userErr.message}`)

        const empCode = `NV${String(nextCode++).padStart(3, '0')}`
        const { error: empErr } = await supabase.from('employees').insert({
          user_id: user.id,
          branch_id,
          employee_code: empCode,
          full_name: row.full_name,
          type: row.type,
          department: row.department ?? null,
          position: row.position ?? null,
          base_salary: row.base_salary,
          allowance: row.allowance,
          join_date: row.join_date,
          status: 'active',
        })

        if (empErr) {
          // Rollback user
          await supabase.from('users').delete().eq('id', user.id)
          throw new Error(`${row.full_name}: ${empErr.message}`)
        }

        successCount++
      } catch (err) {
        importErrors.push(err instanceof Error ? err.message : String(err))
      }
    }

    return new Response(
      JSON.stringify({ success: successCount, errors: importErrors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
