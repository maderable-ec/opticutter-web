import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import StatusBadge from 'src/shared/components/StatusBadge'
import { ACTIVITY_LABEL } from './activities'
import {
  ACTIVITY_LIVE_STATE_CONFIG,
  LIVE_ACTIVITIES,
  PRODUCTION_STATE_CONFIG,
  activityDetail,
  statusDetail,
} from './productionState'
import { useProductionStatus } from './useOrders'

interface ProductionStatusProps {
  // One branch (the seller's, or the one the admin picked); every branch the user sees otherwise.
  branchId?: number
}

/**
 * What each branch's shop floor is doing right now: the saw, the banding and the additional work.
 *
 * Shared by Inicio (the seller sees theirs) and the Resumen of Estadísticas (every branch). The saw
 * is read off the pieces it marks: «Detenida» after `idleMinutes` with no piece marked while it has
 * work, the same rule the statistics use to split effective from stopped hours. The banding and the
 * additional work mark no pieces, so they read as the shop registers them: «Canteando» from
 * «Iniciar» to «Terminar».
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
          <li key={branch.branchId} className="production-status__branch-group">
            <span className="production-status__branch">{branch.branchName}</span>
            <ul className="production-status__tracks">
              <li className="production-status__row">
                <span className="production-status__track">{ACTIVITY_LABEL.cutting}</span>
                <StatusBadge config={PRODUCTION_STATE_CONFIG} value={branch.state} />
                <span className="production-status__detail">{statusDetail(branch, now)}</span>
              </li>
              {LIVE_ACTIVITIES.map((activity) => (
                <li key={activity} className="production-status__row">
                  <span className="production-status__track">{ACTIVITY_LABEL[activity]}</span>
                  <StatusBadge
                    config={ACTIVITY_LIVE_STATE_CONFIG[activity]}
                    value={branch[activity].state}
                  />
                  <span className="production-status__detail">
                    {activityDetail(activity, branch[activity], now)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="production-status__note">
        Corte: «Detenida» es más de {data.idleMinutes} min sin marcar una pieza con trabajo
        pendiente. Canteado y adicionales: según «Iniciar» y «Terminar» en el tablero del taller.
      </p>
    </div>
  )
}

export default ProductionStatus
