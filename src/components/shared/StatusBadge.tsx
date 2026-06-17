import { Badge } from '@/components/ui/badge'

type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'probation'

const employeeStatusMap: Record<EmployeeStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'info' }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'warning' },
  terminated: { label: 'Terminated', variant: 'destructive' },
  probation: { label: 'Probation', variant: 'info' },
}

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const { label, variant } = employeeStatusMap[status]
  return <Badge variant={variant}>{label}</Badge>
}
