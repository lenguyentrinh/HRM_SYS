import { useState, useMemo } from 'react'
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Filter, Download,
  ChevronLeft, ChevronRight, MoreHorizontal, Info, TrendingUp, Ban, Users,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useShiftChangeRequests, useReviewShiftChange } from '../hooks/useShiftChanges'
import { formatDate } from '@/lib/utils'

const STATUS_TABS = [
  { value: 'all', label: 'All Requests' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
] as const

function generatePaginationPages(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i)
  const pages: number[] = []
  if (current <= 2) {
    for (let i = 0; i < Math.min(3, total); i++) pages.push(i)
    if (total > 3) { pages.push(-1); pages.push(total - 1) }
  } else if (current >= total - 3) {
    pages.push(0); pages.push(-1)
    for (let i = total - 3; i < total; i++) pages.push(i)
  } else {
    pages.push(0); pages.push(-1)
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push(-1); pages.push(total - 1)
  }
  return pages
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <Badge variant="warning" className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    )
  }
  if (status === 'approved') {
    return (
      <Badge variant="success" className="inline-flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="inline-flex items-center gap-1">
      <XCircle className="h-3 w-3" />
      Rejected
    </Badge>
  )
}

function SummaryCard({ label, count, icon, bgColor, sub }: {
  label: string
  count: number
  icon: React.ReactNode
  bgColor: string
  sub?: string
}) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            {icon}
          </div>
          <span className="text-xs font-medium text-slate-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{count}</p>
        {sub && <p className="text-xs font-medium text-green-600 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function ShiftChangeListPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: requests, isLoading } = useShiftChangeRequests(statusFilter === 'all' ? undefined : statusFilter)
  const review = useReviewShiftChange()

  const summary = useMemo(() => {
    const all = requests ?? []
    const teams = new Set(all.map((r) => r.employees.department).filter(Boolean))
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending').length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
      teamsImpacted: teams.size,
    }
  }, [requests])

  const pageSize = 8
  const totalPages = Math.ceil((requests?.length ?? 0) / pageSize)
  const paginatedRequests = (requests ?? []).slice(page * pageSize, (page + 1) * pageSize)

  const handleApprove = () => {
    if (!approvingId) return
    review.mutate(
      { id: approvingId, status: 'approved' },
      { onSuccess: () => setApprovingId(null) },
    )
  }

  const handleReject = () => {
    if (!rejectingId || !rejectReason.trim()) return
    review.mutate(
      { id: rejectingId, status: 'rejected', reviewReason: rejectReason.trim() },
      { onSuccess: () => { setRejectingId(null); setRejectReason('') } },
    )
  }

  return (
    <div>
      <PageHeader
        title="Shift Change Requests"
        description="Manage and approve employee requests to swap or change their working hours."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Pending Approvals"
          count={summary.pending}
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          bgColor="bg-orange-50"
          sub="+3 since yesterday"
        />
        <SummaryCard
          label="Swaps This Week"
          count={summary.total}
          icon={<TrendingUp className="h-5 w-5 text-slate-600" />}
          bgColor="bg-slate-100"
        />
        <SummaryCard
          label="Approved"
          count={summary.approved}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
        />
        <SummaryCard
          label="Teams Impacted"
          count={summary.teamsImpacted}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(0) }}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                statusFilter === tab.value
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.value !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({tab.value === 'pending' ? summary.pending : summary.approved})
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Results Info + Action Buttons */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Showing {requests?.length ?? 0} results
          </span>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : !requests?.length ? (
          <EmptyState
            title="No shift change requests"
            description="Requests from employees will appear here."
          />
        ) : (
          <Table>
            <TableHeader className="bg-slate-100 [&_tr]:border-b-0">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Employee</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Current Shift</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Requested Shift</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Effective Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Reason</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Status</TableHead>
                <TableHead className="w-[120px] px-6 py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequests.map((req) => (
                <TableRow key={req.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-base font-medium text-slate-900">{req.employees.full_name}</span>
                        <p className="text-xs text-slate-400 font-mono">{req.employees.employee_code}</p>
                      </div>
                      {req.employees.department && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                          {req.employees.department}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-sm text-slate-600">{req.from_shift.name}</span>
                    <p className="text-xs text-slate-400">{req.from_shift.start_time}–{req.from_shift.end_time}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-sm font-medium text-orange-600">{req.to_shift.name}</span>
                    <p className="text-xs text-slate-400">{req.to_shift.start_time}–{req.to_shift.end_time}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-500">{formatDate(req.date)}</TableCell>
                  <TableCell className="px-6 py-4 max-w-[180px]">
                    <span className="text-sm text-slate-500 line-clamp-2">{req.reason ?? '—'}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <StatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setApprovingId(req.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary hover:bg-orange-50 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Reject"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    ) : req.status === 'approved' && req.review_reason ? (
                      <span className="text-xs text-slate-400 line-clamp-1" title={req.review_reason}>
                        Note: {req.review_reason}
                      </span>
                    ) : req.status === 'rejected' && req.review_reason ? (
                      <span className="text-xs text-slate-400 line-clamp-1" title={req.review_reason}>
                        Reason: {req.review_reason}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {(requests?.length ?? 0) > 0 && (
          <div className="px-6 py-4 flex items-center justify-between gap-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, requests?.length ?? 0)} of {requests?.length ?? 0} requests
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              {generatePaginationPages(page, totalPages).map((p, i) =>
                p === -1 ? (
                  <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center h-9 w-9 text-sm text-slate-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`inline-flex items-center justify-center h-9 min-w-[36px] px-2 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              )}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conflict Alerts + Approval Guidelines */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conflict Alerts */}
        <div className="bg-slate-300 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
          <h3 className="text-xl font-semibold mb-4">Conflict Alerts</h3>
          <div className="space-y-4">
            {summary.pending > 0 && (
              <div className="flex items-start gap-4 p-3 bg-white rounded-xl shadow-sm border-l-4 border-orange-500">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Pending Requests Require Review</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {summary.pending} request{summary.pending > 1 ? 's' : ''} pending approval. Review and process them to keep the schedule up to date.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-4 p-3 bg-white rounded-xl shadow-sm border-l-4 border-primary">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Review Schedule Impact</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approving shift changes may affect shift coverage. Verify adequate staffing before approving.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Guidelines */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-orange-900 mb-4">Approval Guidelines</h3>
          <ul className="space-y-3">
            {[
              'Ensure minimum coverage of 4 supervisors per shift.',
              'Requests must be processed within 48 hours of submission.',
              'Prioritize requests citing medical or family emergencies.',
              'Verify skill balance before approving multi-department swaps.',
            ].map((guideline, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-orange-800">
                <CheckCircle2 className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                {guideline}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!approvingId}
        onOpenChange={(open) => { if (!open) setApprovingId(null) }}
        title="Approve Shift Change"
        description="Are you sure you want to approve this shift change request? This action cannot be undone."
        confirmLabel="Approve"
        variant="default"
        onConfirm={handleApprove}
        isLoading={review.isPending}
      />

      {/* Reject Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => { if (!open) { setRejectingId(null); setRejectReason('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Shift Change</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="min-h-[100px] bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setRejectingId(null); setRejectReason('') }}
                disabled={review.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || review.isPending}
              >
                {review.isPending ? 'Processing...' : 'Reject'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
