import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Upload, Download, Loader2, MoreHorizontal, Filter } from 'lucide-react'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmployeeForm } from '../components/EmployeeForm'
import { BulkImportDialog } from '../components/BulkImportDialog'
import { useEmployees, useUpsertEmployee } from '../hooks/useEmployees'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCurrency } from '@/lib/utils'
import { downloadCSV } from '@/lib/export'
import { supabase } from '@/lib/supabase'
import type { EmployeeFormValues } from '../types'
import type { Employee } from '@/types/database'

export function EmployeeListPage() {
  const navigate = useNavigate()
  const branchId = useAuthStore((s) => s.activeBranchId ?? '')

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const pageSize = 15
  const { data, isLoading, isFetching } = useEmployees({ search, status: statusFilter, type: typeFilter, page, pageSize })
  const upsert = useUpsertEmployee()

  const totalPages = Math.ceil((data?.count ?? 0) / pageSize)

  const handleExportCSV = async () => {
    let query = supabase
      .from('employees')
      .select('employee_code, full_name, department, position, type, base_salary, allowance, join_date, status')
      .eq('branch_id', branchId)
      .order('full_name')
    if (search) query = query.ilike('full_name', `%${search}%`)
    if (statusFilter) query = query.eq('status', statusFilter)
    if (typeFilter) query = query.eq('type', typeFilter)
    const { data } = await query
    if (!data?.length) return
    const headers = ['Code', 'Full Name', 'Department', 'Position', 'Type', 'Base Salary', 'Allowance', 'Join Date', 'Status']
    const rows = (data as Pick<Employee, 'employee_code' | 'full_name' | 'department' | 'position' | 'type' | 'base_salary' | 'allowance' | 'join_date' | 'status'>[]).map((e) => [
      e.employee_code,
      e.full_name,
      e.department ?? '',
      e.position ?? '',
      e.type === 'fulltime' ? 'Full-time' : 'Part-time',
      String(e.base_salary),
      String(e.allowance),
      e.join_date,
      e.status === 'active' ? 'Active' : e.status === 'inactive' ? 'Inactive' : e.status === 'probation' ? 'Probation' : 'Terminated',
    ])
    downloadCSV('employees.csv', [headers, ...rows])
  }

  const handleAdd = (values: EmployeeFormValues) => {
    upsert.mutate(
      { ...values, branch_id: branchId },
      { onSuccess: () => setShowAddDialog(false) }
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[32px] font-semibold leading-[40px] tracking-[-0.01em] text-slate-900">Employees</h1>
            {isFetching && !isLoading && <Loader2 className="h-5 w-5 animate-spin text-orange-600" />}
          </div>
          <p className="text-base text-slate-500 mt-1">{data?.count ?? 0} employees</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 text-orange-950 text-sm font-semibold tracking-[0.05em] rounded-lg hover:brightness-95 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(0) }}
              placeholder="Search by name..."
              className="pl-10 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(0) }}>
            <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(0) }}>
            <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="fulltime">Full-time</SelectItem>
              <SelectItem value="parttime">Part-time</SelectItem>
            </SelectContent>
          </Select>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors">
            <Filter className="h-4 w-4" />
            More Filters
          </button>
        </div>
      </section>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : !data?.data.length ? (
          <EmptyState title="No employees yet" description="Click 'Add Employee' to get started." />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Code</TableHead>
                <TableHead className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Full Name</TableHead>
                <TableHead className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Department / Position</TableHead>
                <TableHead className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Type</TableHead>
                <TableHead className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Base Salary</TableHead>
                <TableHead className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Join Date</TableHead>
                <TableHead className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Status</TableHead>
                <TableHead className="w-[50px] px-6 py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/admin/employees/${emp.id}`)}
                >
                  <TableCell className="px-6 py-4">
                    <span className="font-mono text-xs text-orange-600">{emp.employee_code}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-base font-medium text-slate-900">{emp.full_name}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-sm text-slate-500">
                      {[emp.department, emp.position].filter(Boolean).join(' \u00b7 ') || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600">{emp.type === 'fulltime' ? 'Full-time' : 'Part-time'}</TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-base font-medium text-slate-900">{formatCurrency(emp.base_salary)}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-500">{formatDate(emp.join_date)}</TableCell>
                  <TableCell className="px-6 py-4">
                    {emp.status === 'active' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Active
                      </span>
                    )}
                    {emp.status === 'inactive' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
                        Inactive
                      </span>
                    )}
                    {emp.status === 'probation' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                        Probation
                      </span>
                    )}
                    {emp.status === 'terminated' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                        Terminated
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <button
                      onClick={(e) => { e.stopPropagation() }}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">Page {page + 1} / {totalPages || 1}</p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleAdd}
            isLoading={upsert.isPending}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <BulkImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
    </div>
  )
}
