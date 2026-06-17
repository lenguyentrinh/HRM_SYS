import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, KeyRound, UserCheck, UserX, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmployeeStatusBadge } from '@/components/shared/StatusBadge'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmployeeForm } from '../components/EmployeeForm'
import { useEmployee, useUpsertEmployee, useResetEmployeePassword, useLinkEmployeeAccount, useToggleEmployeeStatus } from '../hooks/useEmployees'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCurrency, formatPhone } from '@/lib/utils'
import type { EmployeeFormValues } from '../types'

export function EmployeeDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const branchId = useAuthStore((s) => s.activeBranchId ?? '')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResetPwDialog, setShowResetPwDialog] = useState(false)
  const [showLinkAccountDialog, setShowLinkAccountDialog] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [linkPhone, setLinkPhone] = useState('')
  const [linkPassword, setLinkPassword] = useState('')

  const { data: employee, isLoading } = useEmployee(id)
  const upsert = useUpsertEmployee()
  const resetPw = useResetEmployeePassword()
  const linkAccount = useLinkEmployeeAccount()
  const toggleStatus = useToggleEmployeeStatus()

  const handleEdit = (values: EmployeeFormValues) => {
    upsert.mutate(
      { ...values, id, branch_id: branchId },
      { onSuccess: () => setShowEditDialog(false) }
    )
  }

  if (isLoading) return <div className="p-6"><CardSkeleton /></div>
  if (!employee) return <div className="p-6 text-slate-500">Employee not found.</div>

  const linkedUser = (employee as unknown as { users: { id: string; role: string; phone: string } | null }).users

  const statusActions: Record<string, { label: string; status: 'active' | 'inactive' | 'terminated' | 'probation'; variant: 'default' | 'outline' }[]> = {
    active: [
      { label: 'Set Inactive', status: 'inactive', variant: 'outline' },
      { label: 'Set Probation', status: 'probation', variant: 'outline' },
      { label: 'Terminate', status: 'terminated', variant: 'outline' },
    ],
    inactive: [
      { label: 'Reactivate', status: 'active', variant: 'default' },
      { label: 'Terminate', status: 'terminated', variant: 'outline' },
    ],
    probation: [
      { label: 'Confirm Active', status: 'active', variant: 'default' },
      { label: 'Terminate', status: 'terminated', variant: 'outline' },
    ],
    terminated: [
      { label: 'Reactivate', status: 'active', variant: 'default' },
    ],
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/employees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{employee.full_name}</h1>
          <p className="text-sm text-slate-500">{employee.employee_code}</p>
        </div>
        <EmployeeStatusBadge status={employee.status} />
        <Button size="sm" onClick={() => setShowEditDialog(true)}>
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">General Info</TabsTrigger>
          <TabsTrigger value="salary">Salary & Allowance</TabsTrigger>
          <TabsTrigger value="status">Status Management</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Login Account</CardTitle>
              {linkedUser && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8"
                  onClick={() => { setNewPassword(''); setShowResetPwDialog(true) }}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset Password
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {linkedUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Account active</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Login phone: </span>
                    <span className="font-mono font-medium">
                      {formatPhone(linkedUser.phone)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <UserX className="h-4 w-4" />
                    <span>No account — employee cannot login</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8"
                    onClick={() => { setLinkPhone(''); setLinkPassword(''); setShowLinkAccountDialog(true) }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Create Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Employee Type</dt>
                  <dd className="font-medium mt-0.5">
                    {employee.type === 'fulltime' ? 'Full-time' : 'Part-time'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Join Date</dt>
                  <dd className="font-medium mt-0.5">{formatDate(employee.join_date)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Department</dt>
                  <dd className="font-medium mt-0.5">{employee.department ?? '\u2014'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Position</dt>
                  <dd className="font-medium mt-0.5">{employee.position ?? '\u2014'}</dd>
                </div>
                {employee.notes && (
                  <div className="col-span-2">
                    <dt className="text-slate-500">Notes</dt>
                    <dd className="font-medium mt-0.5">{employee.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Salary & Allowance</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Base Salary</dt>
                  <dd className="font-semibold text-lg mt-0.5 text-orange-600">
                    {formatCurrency(employee.base_salary)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Allowance</dt>
                  <dd className="font-medium mt-0.5">{formatCurrency(employee.allowance)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Estimated Income</dt>
                  <dd className="font-medium mt-0.5">{formatCurrency(employee.base_salary + employee.allowance)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Employee Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-1">Current status</p>
                <EmployeeStatusBadge status={employee.status} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Change status</p>
                <div className="flex flex-wrap gap-2">
                  {(statusActions[employee.status] ?? []).map((action) => (
                    <Button
                      key={action.status}
                      variant={action.variant}
                      size="sm"
                      onClick={() => toggleStatus.mutate({ id, status: action.status })}
                      disabled={toggleStatus.isPending}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            defaultValues={employee}
            onSubmit={handleEdit}
            isLoading={upsert.isPending}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showLinkAccountDialog} onOpenChange={setShowLinkAccountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Account for {employee.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Enter phone number and password to create a login account for this employee.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number</Label>
              <Input
                type="tel"
                value={linkPhone}
                onChange={(e) => setLinkPhone(e.target.value)}
                placeholder="0912345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Initial Password</Label>
              <Input
                type="text"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkAccountDialog(false)}>Cancel</Button>
              <Button
                disabled={linkPhone.length < 9 || linkPassword.length < 6 || linkAccount.isPending}
                onClick={() => {
                  linkAccount.mutate(
                    { employeeId: id, branchId, phone: linkPhone, password: linkPassword },
                    { onSuccess: () => setShowLinkAccountDialog(false) }
                  )
                }}
              >
                {linkAccount.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetPwDialog} onOpenChange={setShowResetPwDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Set a new password for <span className="font-medium text-slate-700">{employee.full_name}</span>.
              Employee will use this password for next login.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResetPwDialog(false)}>Cancel</Button>
              <Button
                disabled={newPassword.length < 6 || resetPw.isPending}
                onClick={() => {
                  if (!linkedUser) return
                  resetPw.mutate(
                    { userId: linkedUser.id, newPassword },
                    { onSuccess: () => setShowResetPwDialog(false) }
                  )
                }}
              >
                {resetPw.isPending ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
