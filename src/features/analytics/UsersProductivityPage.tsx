import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import { fmtMeters, fmtMoney, fmtNumber } from 'src/shared/utils/format'
import RankTable, { type RankColumn } from './components/RankTable'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import Segmented from './components/Segmented'
import { fmtDecimal, fmtInt, fmtRate } from './format'
import type { BanderFigures, OperatorFigures, SellerFigures } from './types'
import { useBanders, useOperators, useSellers } from './useAnalytics'
import { useReportFilters } from './useReportFilters'

type Team = 'vendedor' | 'operador' | 'canteador'

const TEAMS: { id: Team; label: string }[] = [
  { id: 'vendedor', label: 'Vendedores' },
  { id: 'operador', label: 'Operadores' },
  { id: 'canteador', label: 'Canteadores' },
]

const fmtH = (n: number) => `${fmtDecimal(n)} h`
const money = (n: number) => fmtMoney(n)
const count = (one: string, other: string) => (n: number) => `${fmtInt(n)} ${n === 1 ? one : other}`

const SELLER_COLUMNS: RankColumn<SellerFigures>[] = [
  {
    id: 'paidOrders',
    label: 'Cobradas',
    value: (r) => r.paidOrders,
    format: fmtInt,
    unit: count('cobrada', 'cobradas'),
  },
  {
    id: 'cash',
    label: 'Efectivo',
    value: (r) => r.cash,
    format: money,
    unit: (n) => `${money(n)} efectivo`,
  },
  {
    id: 'credit',
    label: 'Crédito',
    value: (r) => r.credit,
    format: money,
    unit: (n) => `${money(n)} crédito`,
  },
  {
    id: 'total',
    label: 'Total',
    value: (r) => r.total,
    format: money,
    unit: (n) => `${money(n)} total`,
    highlight: true,
  },
  {
    id: 'averageTicket',
    label: 'Ticket',
    value: (r) => r.averageTicket,
    format: money,
    unit: (n) => `ticket ${money(n)}`,
  },
  {
    id: 'pendingAmount',
    label: 'Por cobrar (hoy)',
    value: (r) => r.pendingAmount,
    format: (n, r) => (r.pendingCount > 0 ? `${money(n)} (${fmtInt(r.pendingCount)})` : '—'),
    unit: (n, r) =>
      r.pendingCount > 0 ? `${money(n)} por cobrar (${fmtInt(r.pendingCount)})` : 'nada por cobrar',
  },
]

const OPERATOR_COLUMNS: RankColumn<OperatorFigures>[] = [
  {
    id: 'piecesCut',
    label: 'Piezas',
    value: (r) => r.piecesCut,
    format: fmtInt,
    unit: count('pieza', 'piezas'),
  },
  {
    id: 'boards',
    label: 'Tableros',
    value: (r) => r.boards,
    format: (n) => fmtNumber(n, 1, 0),
    unit: (n) => `${fmtNumber(n, 1, 0)} tableros`,
    highlight: true,
  },
  {
    id: 'cutLinearM',
    label: 'Metros',
    value: (r) => r.cutLinearM,
    format: (n) => fmtMeters(n, 0),
    unit: (n) => `${fmtMeters(n, 0)} de corte`,
  },
  {
    id: 'effectiveHours',
    label: 'Horas efectivas',
    value: (r) => r.effectiveHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} efectivas`,
  },
  {
    id: 'boardsPerHour',
    label: 'Tableros por hora',
    head: (
      <>
        Tabl/<span className="unit">h</span>
      </>
    ),
    value: (r) => r.boardsPerHour,
    format: fmtRate,
    unit: (n) => `${fmtRate(n)} tabl/h`,
    highlight: true,
  },
  {
    id: 'metersPerHour',
    label: 'Metros por hora',
    head: <span className="unit">m/h</span>,
    value: (r) => r.metersPerHour,
    format: fmtDecimal,
    unit: (n) => `${fmtDecimal(n)} m/h`,
  },
  {
    id: 'ordersCut',
    label: 'Órdenes',
    value: (r) => r.ordersCut,
    format: fmtInt,
    unit: count('orden', 'órdenes'),
  },
]

const BANDER_COLUMNS: RankColumn<BanderFigures>[] = [
  {
    id: 'ordersBanded',
    label: 'Canteadas',
    value: (r) => r.ordersBanded,
    format: fmtInt,
    unit: count('canteada', 'canteadas'),
    highlight: true,
  },
  {
    id: 'bandedLinearM',
    label: 'Metros de canteo',
    head: 'Metros',
    value: (r) => r.bandedLinearM,
    format: (n) => fmtMeters(n, 0),
    unit: (n) => `${fmtMeters(n, 0)} de canteo`,
    highlight: true,
  },
  {
    id: 'bandingMetersPerHour',
    label: 'Metros por hora',
    head: <span className="unit">m/h</span>,
    value: (r) => r.bandingMetersPerHour,
    format: fmtDecimal,
    unit: (n) => `${fmtDecimal(n)} m/h`,
  },
  {
    id: 'bandingHours',
    label: 'Horas de canteado',
    value: (r) => r.bandingHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} de canteado`,
  },
  {
    id: 'averageBandingHours',
    label: 'Promedio por orden',
    value: (r) => r.averageBandingHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} por orden`,
  },
  {
    id: 'ordersAdditional',
    label: 'Con adicionales',
    value: (r) => r.ordersAdditional,
    format: fmtInt,
    unit: (n) => `${fmtInt(n)} con adicionales`,
  },
  {
    id: 'additionalHours',
    label: 'Horas de adicionales',
    value: (r) => r.additionalHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} de adicionales`,
  },
]

const CAPTIONS: Record<Team, string> = {
  vendedor:
    'Por fecha de cobro, a quien hizo la cotización. Efectivo incluye transferencia. «Por cobrar» es de hoy: confirmadas sin pago.',
  operador:
    'Cada tablero cuenta para quien marcó su última pieza. Las horas efectivas salen de sus propias marcas, sin las paradas.',
  canteador:
    'Por la fecha en que se cerró el canteado. Metros netos de cinta pegada (sin desperdicio), con los cantos especiales. Las horas van del inicio al cierre: el canteado no marca piezas, así que sus pausas no se separan.',
}

// What each team did in the period, one report per role: what a seller sells is nothing like what
// an operator cuts, and one table of eleven columns made both hard to read. The team lives in
// `?role=`, so it survives a reload; only the team on screen is asked for.
const UsersProductivityPage = () => {
  const filters = useReportFilters()
  const { from, to, branchId } = filters
  const team = TEAMS.find((t) => t.id === filters.role)?.id ?? 'vendedor'

  const sellers = useSellers(from, to, branchId, team === 'vendedor')
  const operators = useOperators(from, to, branchId, team === 'operador')
  const banders = useBanders(from, to, branchId, team === 'canteador')
  const query = team === 'vendedor' ? sellers : team === 'operador' ? operators : banders

  return (
    <div className="report">
      <ReportFilters filters={filters} />

      <ReportSection
        title="Productividad"
        caption={CAPTIONS[team]}
        refreshing={query.isPlaceholderData}
        control={
          <Segmented
            label="Equipo"
            items={TEAMS}
            value={team}
            onChange={(next) => filters.setRole(next === 'vendedor' ? undefined : next)}
          />
        }
      >
        {query.isLoading ? (
          <LoadingBlock rows={5} label="Cargando productividad…" />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : team === 'vendedor' && sellers.data ? (
          <RankTable
            rows={sellers.data.sellers}
            total={sellers.data.total}
            columns={SELLER_COLUMNS}
            empty="Sin ventas en el período"
          />
        ) : team === 'operador' && operators.data ? (
          <RankTable
            rows={operators.data.operators}
            total={operators.data.total}
            columns={OPERATOR_COLUMNS}
            empty="Sin cortes en el período"
          />
        ) : team === 'canteador' && banders.data ? (
          <RankTable
            rows={banders.data.banders}
            total={banders.data.total}
            columns={BANDER_COLUMNS}
            empty="Sin canteado en el período"
          />
        ) : null}
      </ReportSection>
    </div>
  )
}

export default UsersProductivityPage
