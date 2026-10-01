import type { ReactNode } from 'react'
import { fmtM2, fmtMoney, fmtPercent } from 'src/shared/utils/format'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import StatTile from 'src/shared/components/StatTile'
import { useSummary } from '../useAnalytics'
import { fmtInt, fmtRatio } from '../format'
import ReportSection from './ReportSection'

interface KpiCardsProps {
  from: string
  to: string
  branchId?: number
}

const Tiles = ({ children }: { children: ReactNode }) => (
  <div className="report-tiles">{children}</div>
)

/**
 * The period's figures, once each. There used to be a fourth block, «Operación y eficiencia», that
 * repeated three of these from a second endpoint (`/analytics/operations`) the API computes with
 * the very same function; it cost a request and showed the same number twice on one screen.
 *
 * Grouped by what the admin asks: how much was sold, what the shop produced, and what is left to
 * chase. The hints say what each figure counts, since «realizado» means finished or dispatched and
 * nothing on screen said so.
 */
const KpiCards = ({ from, to, branchId }: KpiCardsProps) => {
  const { data: s, isLoading, isError, isPlaceholderData, refetch } = useSummary(from, to, branchId)

  if (isLoading || isError || !s) {
    return (
      <ReportSection title="Ventas">
        {isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <LoadingBlock variant="cards" rows={4} label="Cargando indicadores…" />
        )}
      </ReportSection>
    )
  }

  return (
    <>
      <ReportSection
        title="Ventas"
        caption="Órdenes creadas en el período."
        refreshing={isPlaceholderData}
      >
        <Tiles>
          <StatTile
            emphasis
            label="Ingresos realizados"
            value={fmtMoney(s.realizedRevenue)}
            hint="Terminadas y despachadas"
          />
          <StatTile
            label="Ticket promedio"
            value={fmtMoney(s.averageTicket)}
            hint="Por orden realizada"
          />
          <StatTile label="Órdenes" value={fmtInt(s.orderCount)} hint="En cualquier estado" />
          <StatTile
            label="Clientes activos"
            value={fmtInt(s.activeClientsCount)}
            hint="Con alguna orden"
          />
        </Tiles>
      </ReportSection>

      <ReportSection
        title="Producción"
        caption="De las órdenes terminadas y despachadas."
        className="report__wide"
        refreshing={isPlaceholderData}
      >
        <Tiles>
          <StatTile label="Tableros consumidos" value={fmtInt(s.totalBoardsConsumed)} />
          <StatTile
            label="Eficiencia promedio"
            value={fmtPercent(s.averageEfficiency)}
            hint="Ponderada por área"
          />
          <StatTile label="Área cortada" value={fmtM2(s.totalAreaCutM2, 1)} />
          <StatTile label="Merma estimada" value={fmtM2(s.wasteEstimateM2, 1)} />
        </Tiles>
      </ReportSection>

      <ReportSection title="Seguimiento" className="report__narrow" refreshing={isPlaceholderData}>
        <Tiles>
          <StatTile
            label="Por cobrar"
            value={fmtInt(s.pendingOrdersCount)}
            hint="Confirmadas, sin pasar a cola"
          />
          <StatTile
            label="Cancelación"
            value={fmtRatio(s.cancellationRate)}
            hint="De las órdenes creadas"
          />
        </Tiles>
      </ReportSection>
    </>
  )
}

export default KpiCards
