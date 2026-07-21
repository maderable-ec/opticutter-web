import { CButton, CCard, CCardBody, CCardHeader, CListGroup, CListGroupItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'

import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import { usePrintJobs, useRetryPrintJob } from './usePrint'
import type { PrintJobListItem, PrintJobStatus, PrintJobType } from './printApi'

// We fetch every recent status (incl. `done`) so we can collapse each order to its LATEST print
// attempt: a retry supersedes the old failed row instead of stacking a second one, and a row
// vanishes the moment that order's latest attempt prints OK.
const FETCH_LIMIT = 40

// Keeps only the newest job per order+type, dropping the ones whose latest attempt already printed.
// Relies on the API returning jobs newest-first, so the first occurrence of a key is the latest.
const latestAttempts = (jobs: PrintJobListItem[]): PrintJobListItem[] => {
  const seen = new Set<string>()
  const rows: PrintJobListItem[] = []
  for (const job of jobs) {
    const key = `${job.orderId}:${job.jobType}`
    if (seen.has(key)) continue
    seen.add(key)
    if (job.status === 'done') continue // latest attempt succeeded → nothing to show
    rows.push(job)
  }
  return rows
}

const STATUS_CONFIG: Record<PrintJobStatus, StatusConfigEntry> = {
  pending: { color: 'info', label: 'Imprimiendo…' },
  sent: { color: 'info', label: 'Imprimiendo…' },
  done: { color: 'success', label: 'Impreso' },
  error: { color: 'danger', label: 'Error' },
  expired: { color: 'warning', label: 'Expiró' },
}

const TYPE_LABEL: Record<PrintJobType, string> = {
  sheet: 'Hoja consolidada',
  label: 'Etiqueta',
}

// A job the agent is still expected to pick up: retrying now would just duplicate it.
const isInFlight = (status: PrintJobStatus) => status === 'pending' || status === 'sent'

const fmtRelative = (iso: string): string => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  return `hace ${hours} h`
}

interface PrintJobRowProps {
  job: PrintJobListItem
  onRetry: (jobId: number) => void
  retrying: boolean
}

const PrintJobRow = ({ job, onRetry, retrying }: PrintJobRowProps) => (
  <CListGroupItem className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
    <div className="d-flex flex-column">
      <span className="fw-semibold">
        {job.orderCode ?? `Orden #${job.orderId}`} · {TYPE_LABEL[job.jobType]}
      </span>
      <span className="text-body-secondary small">
        {job.clientName ? `${job.clientName} · ` : ''}
        {fmtRelative(job.createdAt)}
        {job.attempts > 1 ? ` · intento ${job.attempts}` : ''}
      </span>
      {job.status === 'error' && job.errorMessage && (
        <span className="text-danger small">{job.errorMessage}</span>
      )}
    </div>
    <div className="d-flex align-items-center gap-2">
      <StatusBadge config={STATUS_CONFIG} value={job.status} />
      <CButton
        color="primary"
        variant="outline"
        size="sm"
        disabled={isInFlight(job.status) || retrying}
        title={isInFlight(job.status) ? 'La impresión sigue en curso' : undefined}
        onClick={() => onRetry(job.id)}
      >
        <CIcon icon={cilReload} className="me-1" />
        Reintentar
      </CButton>
    </div>
  </CListGroupItem>
)

// Shop-floor print panel: surfaces the branch's recent print jobs with their real status so a
// failed consolidated sheet (or label) can be re-dispatched from the board — the only screen the
// operator/canteador have. Renders nothing when there's nothing pending or failed.
const PrintJobsPanel = () => {
  const { data: jobs = [] } = usePrintJobs({ limit: FETCH_LIMIT })
  const retry = useRetryPrintJob()

  const rows = latestAttempts(jobs)
  if (rows.length === 0) return null

  return (
    <CCard className="mb-3 border-warning-subtle">
      <CCardHeader className="fw-semibold">Impresiones</CCardHeader>
      <CCardBody className="p-0">
        <CListGroup flush>
          {rows.map((job) => (
            <PrintJobRow
              key={job.id}
              job={job}
              onRetry={(id) => retry.mutate(id)}
              retrying={retry.isPending && retry.variables === job.id}
            />
          ))}
        </CListGroup>
      </CCardBody>
    </CCard>
  )
}

export default PrintJobsPanel
