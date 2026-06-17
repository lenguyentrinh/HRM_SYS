import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { shiftFormSchema, type ShiftFormValues } from '../types'
import type { Shift } from '@/types/database'

interface ShiftFormProps {
  defaultValues?: Partial<Shift>
  onSubmit: (values: ShiftFormValues) => void
  isLoading?: boolean
  onCancel?: () => void
}

export function ShiftForm({ defaultValues, onSubmit, isLoading, onCancel }: ShiftFormProps) {
  const isEditing = !!defaultValues?.id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(shiftFormSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      start_time: defaultValues?.start_time ?? '08:00',
      end_time: defaultValues?.end_time ?? '17:00',
      grace_period_minutes: defaultValues?.grace_period_minutes ?? 5,
      early_leave_minutes: defaultValues?.early_leave_minutes ?? 15,
      is_overnight: defaultValues?.is_overnight ?? false,
      is_active: defaultValues?.is_active ?? true,
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values as ShiftFormValues))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Shift Name *</Label>
        <Input id="name" {...register('name')} placeholder="Morning Shift" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start_time">Start Time *</Label>
          <Input id="start_time" type="time" {...register('start_time')} />
          {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="end_time">End Time *</Label>
          <Input id="end_time" type="time" {...register('end_time')} />
          {errors.end_time && <p className="text-xs text-destructive">{errors.end_time.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="grace_period_minutes">Grace Period (minutes)</Label>
          <Input id="grace_period_minutes" type="number" {...register('grace_period_minutes')} placeholder="5" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="early_leave_minutes">Early Leave (minutes)</Label>
          <Input id="early_leave_minutes" type="number" {...register('early_leave_minutes')} placeholder="15" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="is_overnight">Overnight Shift</Label>
        <Switch id="is_overnight" checked={watch('is_overnight')} onCheckedChange={(v) => setValue('is_overnight', v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="is_active">Active</Label>
        <Switch id="is_active" checked={watch('is_active')} onCheckedChange={(v) => setValue('is_active', v)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEditing ? 'Update Shift' : 'Create Shift'}
        </Button>
      </div>
    </form>
  )
}
