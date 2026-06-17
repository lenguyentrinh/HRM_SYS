import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { employeeFormSchema, type EmployeeFormValues } from '../types'
import type { Employee } from '@/types/database'

interface EmployeeFormProps {
  defaultValues?: Partial<Employee>
  onSubmit: (values: EmployeeFormValues) => void
  isLoading?: boolean
  onCancel?: () => void
}

export function EmployeeForm({ defaultValues, onSubmit, isLoading, onCancel }: EmployeeFormProps) {
  const isEditing = !!defaultValues?.id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(employeeFormSchema) as any,
    defaultValues: {
      full_name: defaultValues?.full_name ?? '',
      type: defaultValues?.type ?? 'fulltime' as const,
      department: defaultValues?.department ?? '',
      position: defaultValues?.position ?? '',
      base_salary: defaultValues?.base_salary ?? 0,
      allowance: defaultValues?.allowance ?? 0,
      join_date: defaultValues?.join_date ?? '',
      status: defaultValues?.status ?? 'active' as const,
      notes: defaultValues?.notes ?? '',
      phone: '',
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values as EmployeeFormValues))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input id="full_name" {...register('full_name')} placeholder="John Doe" />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        {!isEditing && (
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="phone">Phone Number (for login) *</Label>
            <Input id="phone" {...register('phone')} placeholder="0912345678" inputMode="tel" />
            <p className="text-xs text-slate-400">Initial password is set by system default. Employee can change after login.</p>
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Employee Type *</Label>
          <Select value={watch('type')} onValueChange={(v) => setValue('type', v as 'fulltime' | 'parttime')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fulltime">Full-time</SelectItem>
              <SelectItem value="parttime">Part-time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={watch('status')} onValueChange={(v) => setValue('status', v as 'active' | 'inactive' | 'terminated' | 'probation')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department">Department</Label>
          <Input id="department" {...register('department')} placeholder="Sales" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="position">Position</Label>
          <Input id="position" {...register('position')} placeholder="Staff" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="base_salary">Base Salary *</Label>
          <Input id="base_salary" type="number" {...register('base_salary')} placeholder="6000000" />
          {errors.base_salary && <p className="text-xs text-destructive">{errors.base_salary.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="allowance">Allowance</Label>
          <Input id="allowance" type="number" {...register('allowance')} placeholder="500000" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="join_date">Join Date *</Label>
          <Input id="join_date" type="date" {...register('join_date')} />
          {errors.join_date && <p className="text-xs text-destructive">{errors.join_date.message}</p>}
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" {...register('notes')} placeholder="Additional notes..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEditing ? 'Update' : 'Add Employee'}
        </Button>
      </div>
    </form>
  )
}
