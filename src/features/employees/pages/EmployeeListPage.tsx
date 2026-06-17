import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Upload, Download, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { EmployeeStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmployeeForm } from '../components/EmployeeForm'
import { BulkImportDialog } from '../components/BulkImportDialog'
import { useEmployees, useUpsertEmployee } from '../hooks/useEmployees'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { EmployeeFormValues } from '../types'

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

  const handleAdd = (values: EmployeeFormValues) => {
    upsert.mutate(
      { ...values, branch_id: branchId },
      { onSuccess: () => setShowAddDialog(false) }
    )
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description={
          <span className="flex items-center gap-1.5">
            {data?.count ?? 0} employees
            {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </>
        }
      />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0) }}
            placeholder="Search by name..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="probation">Probation</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="fulltime">Full-time</SelectItem>
            <SelectItem value="parttime">Part-time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : !data?.data.length ? (
          <EmptyState title="No employees yet" description="Click 'Add Employee' to get started." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Department / Position</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/employees/${emp.id}`)}
                >
                  <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {[emp.department, emp.position].filter(Boolean).join(' - ') || '\u2014'}
                  </TableCell>
                  <TableCell>{emp.type === 'fulltime' ? 'Full-time' : 'Part-time'}</TableCell>
                  <TableCell>{formatCurrency(emp.base_salary)}</TableCell>
                  <TableCell>{formatDate(emp.join_date)}</TableCell>
                  <TableCell>
                    <EmployeeStatusBadge status={emp.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>Page {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

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
