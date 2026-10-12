import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import { useListParams } from 'src/shared/hooks/useListParams'
import { fmtMeters, fmtMoney, fmtNumber } from 'src/shared/utils/format'
import RankTable, { type RankColumn } from './components/RankTable'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import Segmented from './components/Segmented'
import { fmtDecimal, fmtInt, fmtRate } from './format'
import BanderOrdersModal from './BanderOrdersModal'
import OperatorBoardsModal from './OperatorBoardsModal'
import SellerOrdersModal from './SellerOrdersModal'
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
    label: 'Al contado',
    value: (r) => r.cash,
    format: money,
    unit: (n) => `${money(n)} al contado`,
  },
  {
    id: 'credit',
    label: 'Vendido a crédito',
    head: 'A crédito',
    value: (r) => r.credit,
    format: money,
    unit: (n) => `${money(n)} a crédito`,
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
  {
    // Credit paid back in the period on their orders, whenever they were sold.
    id: 'creditCollected',
    label: 'Abonos recibidos',
    head: 'Abonos',
    value: (r) => r.creditCollected,
    format: (n) => (n > 0 ? money(n) : '—'),
    unit: (n) => (n > 0 ? `${money(n)} en abonos` : 'sin abonos'),
  },
  {
    // What their clients owe right now: a snapshot, like «Por cobrar».
    id: 'creditOutstanding',
    label: 'Crédito pendiente (hoy)',
    value: (r) => r.creditOutstanding,
    format: (n) => (n > 0 ? money(n) : '—'),
    unit: (n) => (n > 0 ? `${money(n)} de crédito pendiente` : 'sin crédito pendiente'),
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
  // The cut's time and its two parts: the load (taking the order to its first piece) and the
  // sawing (first piece to last). «Tiempo» is what the two rates divide by.
  {
    id: 'loadingHours',
    label: 'Carga',
    value: (r) => r.loadingHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} de carga`,
  },
  {
    id: 'sawingHours',
    label: 'Sierra',
    value: (r) => r.sawingHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} de sierra`,
  },
  {
    id: 'workHours',
    label: 'Tiempo de corte',
    head: 'Tiempo',
    value: (r) => r.workHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} de corte`,
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
  {
    // The pauses they registered on the cut, and the working hours those took: time that is NOT
    // in «Tiempo».
    id: 'pausedHours',
    label: 'En pausa',
    value: (r) => r.pausedHours,
    format: (n, r) => (r.pauses > 0 ? `${fmtH(n)} (${fmtInt(r.pauses)})` : '—'),
    unit: (n, r) => (r.pauses > 0 ? `${fmtH(n)} en pausa (${fmtInt(r.pauses)})` : 'sin pausas'),
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
    head: 'Horas',
    value: (r) => r.bandingHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} de canteado`,
  },
  {
    id: 'averageBandingHours',
    label: 'Promedio por orden',
    head: 'Por orden',
    value: (r) => r.averageBandingHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} por orden`,
  },
  {
    id: 'ordersAdditional',
    label: 'Con adicionales',
    head: 'Adicionales',
    value: (r) => r.ordersAdditional,
    format: fmtInt,
    unit: (n) => `${fmtInt(n)} con adicionales`,
  },
  {
    id: 'additionalHours',
    label: 'Horas de adicionales',
    head: 'Horas adic.',
    value: (r) => r.additionalHours,
    format: fmtH,
    unit: (n) => `${fmtH(n)} de adicionales`,
  },
  {
    id: 'pausedHours',
    label: 'En pausa',
    value: (r) => r.pausedHours,
    format: (n) => (n > 0 ? fmtH(n) : '—'),
    unit: (n) => (n > 0 ? `${fmtH(n)} en pausa` : 'sin pausas'),
  },
  {
    // Iniciar and Terminar tapped together after the work: it counts, but it has no time. Kept in
    // sight because the hours and the live «Canteando» are only as good as this is low.
    id: 'unclocked',
    label: 'Registradas al cerrar',
    head: 'Sin tiempo',
    value: (r) => r.ordersBandedUnclocked + r.ordersAdditionalUnclocked,
    format: (n, r) => {
      const all = r.ordersBanded + r.ordersAdditional
      return all > 0 ? `${fmtInt(n)} de ${fmtInt(all)}` : '—'
    },
    unit: (n) => `${fmtInt(n)} registradas al cerrar`,
  },
]

const CAPTIONS: Record<Team, string> = {
  vendedor:
    'Por fecha de cobro, a quien hizo la cotización. «Al contado» incluye transferencia. «Abonos» es el crédito cobrado en el período, se haya vendido cuando sea. «Por cobrar» y «Crédito pendiente» son de hoy: confirmadas sin pago, y lo que aún deben sus clientes. Toca un vendedor para ver sus órdenes, con su factura.',
  operador:
    'Cada tablero cuenta para quien marcó su última pieza. El tiempo de corte va de tomar la orden a su última pieza: carga hasta la primera, sierra después. No cuentan las pausas registradas ni lo que cae fuera del horario laboral. Toca un operador para ver hoja por hoja y orden por orden.',
  canteador:
    'Por la fecha en que se cerró el canteado. Metros netos de cinta pegada (sin desperdicio), con los cantos especiales. Las horas van del inicio al cierre, sin las pausas registradas ni lo que cae fuera del horario laboral. «Sin tiempo»: iniciadas y terminadas en menos de un minuto, registradas al final; cuentan como trabajo, pero no suman horas. Toca un canteador para ver orden por orden.',
}

// What each team did in the period, one report per role: what a seller sells is nothing like what
// an operator cuts, and one table of eleven columns made both hard to read. The team lives in
// `?role=`, so it survives a reload; only the team on screen is asked for.
const UsersProductivityPage = () => {
  const filters = useReportFilters()
  const { from, to, branchId } = filters
  const team = TEAMS.find((t) => t.id === filters.role)?.id ?? 'vendedor'
  // The person whose detail is open, in the URL: Back closes it, and a link opens it. The team
  // says which detail; switching teams closes it in the same write.
  const { getParam, setParams } = useListParams()
  const rawUser = Number(getParam('user'))
  const userId = Number.isInteger(rawUser) && rawUser > 0 ? rawUser : undefined
  const openUser = (row: { userId: number | null }) => setParams({ user: String(row.userId) })
  const closeUser = () => setParams({ user: undefined })
  const detailProps = { from, to, branchId, onClose: closeUser }

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
            onChange={(next) =>
              setParams({ role: next === 'vendedor' ? undefined : next, user: undefined })
            }
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
            onRowClick={openUser}
          />
        ) : team === 'operador' && operators.data ? (
          <RankTable
            rows={operators.data.operators}
            total={operators.data.total}
            columns={OPERATOR_COLUMNS}
            empty="Sin cortes en el período"
            onRowClick={openUser}
          />
        ) : team === 'canteador' && banders.data ? (
          <RankTable
            rows={banders.data.banders}
            total={banders.data.total}
            columns={BANDER_COLUMNS}
            empty="Sin canteado en el período"
            onRowClick={openUser}
          />
        ) : null}
      </ReportSection>

      <SellerOrdersModal userId={team === 'vendedor' ? userId : undefined} {...detailProps} />
      <OperatorBoardsModal userId={team === 'operador' ? userId : undefined} {...detailProps} />
      <BanderOrdersModal userId={team === 'canteador' ? userId : undefined} {...detailProps} />
    </div>
  )
}

export default UsersProductivityPage
