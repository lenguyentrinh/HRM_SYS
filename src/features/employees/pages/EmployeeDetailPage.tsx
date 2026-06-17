import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Download, KeyRound, UserCheck, UserX, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmployeeForm } from '../components/EmployeeForm'
import { useEmployee, useUpsertEmployee, useResetEmployeePassword, useLinkEmployeeAccount, useToggleEmployeeStatus } from '../hooks/useEmployees'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCurrency, formatPhone } from '@/lib/utils'
import type { EmployeeFormValues } from '../types'

const statusDotMap: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-orange-500',
  probation: 'bg-blue-500',
  terminated: 'bg-red-500',
}

export function EmployeeDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const branchId = useAuthStore((s) => s.activeBranchId ?? '')
  const [activeTab, setActiveTab] = useState('info')
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

  const tabs = [
    { key: 'info', label: 'General Info' },
    { key: 'salary', label: 'Salary & Allowance' },
    { key: 'status', label: 'Status Management' },
  ]

  return (
    <div className="">
      {/* Back link */}
      <button
        onClick={() => navigate('/admin/employees')}
        className="flex items-center gap-2 text-primary font-medium hover:underline text-sm mb-6 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Employees
      </button>

      {/* Profile Hero */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[32px] font-semibold leading-[40px] tracking-[-0.01em] text-slate-900">{employee.full_name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-500">{employee.position || employee.department || '\u2014'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-mono text-orange-600">{employee.employee_code}</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                  employee.status === 'active' ? 'bg-green-100 text-green-800' :
                  employee.status === 'inactive' ? 'bg-orange-100 text-orange-800' :
                  employee.status === 'probation' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDotMap[employee.status]}`} />
                  {employee.status === 'active' ? 'Active' :
                   employee.status === 'inactive' ? 'Inactive' :
                   employee.status === 'probation' ? 'Probation' : 'Terminated'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors">
              <Download className="h-4 w-4" />
              Export Dossier
            </button>
            <Button size="sm" onClick={() => setShowEditDialog(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-6 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* General Info Tab */}
      {activeTab === 'info' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Full Name</p>
              <p className="text-sm font-semibold text-slate-900">{employee.full_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Employee Code</p>
              <p className="text-sm font-semibold text-slate-900 font-mono text-orange-600">{employee.employee_code}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Employment Type</p>
              <p className="text-sm font-semibold text-slate-900">{employee.type === 'fulltime' ? 'Full-time' : 'Part-time'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Department</p>
              <p className="text-sm font-semibold text-slate-900">{employee.department ?? '\u2014'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Position</p>
              <p className="text-sm font-semibold text-slate-900">{employee.position ?? '\u2014'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Base Salary</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(employee.base_salary)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Allowance</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(employee.allowance)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Join Date</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(employee.join_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Status</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                employee.status === 'active' ? 'bg-green-100 text-green-800' :
                employee.status === 'inactive' ? 'bg-orange-100 text-orange-800' :
                employee.status === 'probation' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotMap[employee.status]}`} />
                {employee.status === 'active' ? 'Active' :
                 employee.status === 'inactive' ? 'Inactive' :
                 employee.status === 'probation' ? 'Probation' : 'Terminated'}
              </span>
            </div>
            {employee.notes && (
              <div className="col-span-full">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm font-semibold text-slate-900">{employee.notes}</p>
              </div>
            )}
          </div>

          {/* Account & Actions */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Login Account</p>
                {linkedUser ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <UserCheck className="h-3.5 w-3.5" />
                      Account active
                    </span>
                    <span className="text-sm text-slate-600">Login phone: {formatPhone(linkedUser.phone)}</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <UserX className="h-3.5 w-3.5" />
                    No account
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {linkedUser ? (
                  <button
                    onClick={() => { setNewPassword(''); setShowResetPwDialog(true) }}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    Reset Password
                  </button>
                ) : (
                  <button
                    onClick={() => { setLinkPhone(''); setLinkPassword(''); setShowLinkAccountDialog(true) }}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </button>
                )}
                {employee.status !== 'terminated' && (
                  <button
                    onClick={() => toggleStatus.mutate({ id, status: 'terminated' })}
                    disabled={toggleStatus.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <UserX className="h-4 w-4" />
                    Terminate Employment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary & Allowance Tab */}
      {activeTab === 'salary' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">Salary & Allowance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Base Salary</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(employee.base_salary)}</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Allowance</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(employee.allowance)}</p>
            </div>
            <div className="p-5 rounded-xl bg-orange-50 border border-orange-100">
              <p className="text-xs font-medium text-orange-700 uppercase tracking-wider mb-2">Estimated Income</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(employee.base_salary + employee.allowance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Management Tab */}
      {activeTab === 'status' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">Employee Status</h3>
          <div className="flex items-center gap-4 mb-8">
            <span className="text-sm text-slate-700">Current Status:</span>
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${
              employee.status === 'active' ? 'bg-green-100 text-green-800' :
              employee.status === 'inactive' ? 'bg-orange-100 text-orange-800' :
              employee.status === 'probation' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${statusDotMap[employee.status]}`} />
              {employee.status === 'active' ? 'Active' :
               employee.status === 'inactive' ? 'Inactive' :
               employee.status === 'probation' ? 'Probation' : 'Terminated'}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Change status</h4>
            <div className="flex flex-wrap gap-3">
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
        </div>
      )}

      {/* Dialogs */}
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
