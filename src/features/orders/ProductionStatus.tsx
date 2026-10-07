import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import StatusBadge from 'src/shared/components/StatusBadge'
import { PRODUCTION_STATE_CONFIG, statusDetail } from './productionState'
import { useProductionStatus } from './useOrders'

interface ProductionStatusProps {
  // One branch (the seller's, or the one the admin picked); every branch the user sees otherwise.
  branchId?: number
}

/**
 * Whether each branch's saw is cutting right now, read off the pieces it marks.
 *
 * Shared by Inicio (the seller sees theirs) and the Resumen of Estadísticas (every branch). Only the
 * cut is measured: a branch reads «Detenida» after `idleMinutes` with no piece marked while it has
 * work, the same rule the statistics use to split effective from stopped hours.
 */
const ProductionStatus = ({ branchId }: ProductionStatusProps) => {
  // «hace 12 min» counts from when the state was read, which the minute's refetch moves along — and
  // reading `dataUpdatedAt` is what re-renders the line even when the state itself did not change.
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useProductionStatus(branchId)

  if (isLoading) return <LoadingBlock rows={2} label="Cargando el estado del taller…" />
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />

  const now = new Date(dataUpdatedAt)
  return (
    <div className="production-status">
      <ul className="production-status__list">
        {data.branches.map((branch) => (
          <li key={branch.branchId} className="production-status__row">
            <span className="production-status__branch">{branch.branchName}</span>
            <StatusBadge config={PRODUCTION_STATE_CONFIG} value={branch.state} />
            <span className="production-status__detail">{statusDetail(branch, now)}</span>
          </li>
        ))}
      </ul>
      <p className="production-status__note">
        Solo el corte: «Detenida» es más de {data.idleMinutes} min sin marcar una pieza con trabajo
        pendiente.
      </p>
    </div>
  )
}

export default ProductionStatus
