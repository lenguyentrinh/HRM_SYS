import { useState, useMemo } from 'react'
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useShiftChangeRequests, useReviewShiftChange } from '../hooks/useShiftChanges'
import { formatDate } from '@/lib/utils'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const

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

function SummaryCard({ label, count, icon, bgColor, textColor }: {
  label: string
  count: number
  icon: React.ReactNode
  bgColor: string
  textColor: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{count}</p>
        <p className={`text-xs font-medium ${textColor}`}>{label}</p>
      </div>
    </div>
  )
}

export function ShiftChangeListPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: requests, isLoading } = useShiftChangeRequests(statusFilter === 'all' ? undefined : statusFilter)
  const review = useReviewShiftChange()

  const summary = useMemo(() => {
    const all = requests ?? []
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending').length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
    }
  }, [requests])

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
        description={`${summary.total} total requests`}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Requests"
          count={summary.total}
          icon={<AlertTriangle className="h-5 w-5 text-slate-600" />}
          bgColor="bg-slate-100"
          textColor="text-slate-600"
        />
        <SummaryCard
          label="Pending"
          count={summary.pending}
          icon={<Clock className="h-5 w-5 text-orange-600" />}
          bgColor="bg-orange-50"
          textColor="text-orange-600"
        />
        <SummaryCard
          label="Approved"
          count={summary.approved}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
          textColor="text-green-600"
        />
        <SummaryCard
          label="Rejected"
          count={summary.rejected}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          bgColor="bg-red-50"
          textColor="text-red-600"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                ({tab.value === 'pending' ? summary.pending : tab.value === 'approved' ? summary.approved : summary.rejected})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : !requests?.length ? (
          <EmptyState
            title="No shift change requests"
            description="Requests from employees will appear here."
          />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 [&_tr]:border-b-0">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Employee</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">From Shift</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">To Shift</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Reason</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Status</TableHead>
                <TableHead className="w-[140px] px-6 py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors border-orange-200">
                  <TableCell className="px-6 py-4">
                    <div>
                      <span className="text-base font-medium text-slate-900">{req.employees.full_name}</span>
                      <p className="text-xs text-slate-400 font-mono">{req.employees.employee_code}</p>
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
                  <TableCell className="px-6 py-4 max-w-[200px]">
                    <span className="text-sm text-slate-500 line-clamp-2">{req.reason ?? '—'}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <StatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setApprovingId(req.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                    {req.status === 'approved' && req.review_reason && (
                      <span className="text-xs text-slate-400 line-clamp-1" title={req.review_reason}>
                        Note: {req.review_reason}
                      </span>
                    )}
                    {req.status === 'rejected' && req.review_reason && (
                      <span className="text-xs text-slate-400 line-clamp-1" title={req.review_reason}>
                        Reason: {req.review_reason}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
