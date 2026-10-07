import { Link } from 'react-router-dom'
import { CCol, CRow } from '@coreui/react'

import NoBranchNotice, { isNoBranchError } from 'src/shared/components/NoBranchNotice'
import Section from 'src/shared/components/Section'
import StatTile from 'src/shared/components/StatTile'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { useListParams } from 'src/shared/hooks/useListParams'
import { fmtMoney, fmtNumber } from 'src/shared/utils/format'
import { useCurrentUser, useHasRole } from 'src/features/auth/useAuth'
import OrderCard from 'src/features/orders/OrderCard'
import ProductionStatus from 'src/features/orders/ProductionStatus'

import HomeActions from './HomeActions'
import HomeRow from './HomeRow'
import { attentionRows, lowStockLink, productionRows, stalestLink } from './home'
import { useAttention, useProduction, useStock, useToday, useTodaySales } from './useHome'

// The seller's and the admin's first screen: what to do next, not how the month went (that is
// Resumen). Every block is a count that opens the listing already filtered, so the screen is a
// set of doors rather than a report to read.

interface AttentionSectionProps {
  branchId?: number
  attention: ReturnType<typeof useAttention>
}

const AttentionSection = ({ branchId, attention }: AttentionSectionProps) => {
  const { counts, failed, retry } = attention
  const rows = attentionRows(branchId)
  return (
    <Section title="Requiere atención" failed={failed} onRetry={retry}>
      <div className="home-rows">
        {(Object.keys(rows) as (keyof typeof rows)[]).map((key) => (
          <HomeRow key={key} spec={rows[key]} count={counts[key]} loading={!failed} />
        ))}
      </div>
    </Section>
  )
}

const ProductionSection = ({ branchId }: { branchId?: number }) => {
  const { counts, stalest, failed, retry } = useProduction(branchId)
  const rows = productionRows(branchId)
  return (
    <Section
      title="Producción"
      action={
        <Link to={stalestLink(branchId)} className="small">
          Ver todas ›
        </Link>
      }
      failed={failed}
      onRetry={retry}
    >
      {/* Is the saw cutting right now: the seller's own branch, every branch for the admin. */}
      <div className="mb-3">
        <ProductionStatus branchId={branchId} />
      </div>
      <div className="home-rows">
        <HomeRow spec={rows.queued} count={counts.queued} loading={!failed} />
        <HomeRow spec={rows.inProcess} count={counts.inProcess} loading={!failed} />
      </div>
      {/* The ones that have sat longest in their status: the question the shop gets asked. */}
      <div className="eyebrow mt-3 mb-1">Más estancadas</div>
      {stalest === undefined ? (
        !failed && <LoadingBlock rows={3} label="Cargando órdenes…" />
      ) : stalest.length === 0 ? (
        <p className="text-body-secondary small mb-0">No hay órdenes en producción.</p>
      ) : (
        <div className="list-cards">
          {stalest.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </Section>
  )
}

const dayLabel = new Intl.DateTimeFormat('es-EC', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const TodaySection = ({ branchId }: { branchId?: number }) => {
  const { figures, failed: ordersFailed, retry: retryOrders } = useToday(branchId)
  const { sales, failed: salesFailed, retry: retrySales } = useTodaySales(branchId)
  const value = (n: number | undefined, format: (n: number) => string = String) =>
    n === undefined ? '—' : format(n)
  return (
    <Section
      title={`Hoy · ${dayLabel.format(new Date())}`}
      action={
        // Resumen compares every branch; the one picked here rides along to the tabs that filter
        // by it (Producción, Productividad).
        <Link
          to={branchId ? `/analytics/summary?branchId=${branchId}` : '/analytics/summary'}
          className="small"
        >
          Resumen ›
        </Link>
      }
      failed={ordersFailed || salesFailed}
      onRetry={() => {
        retryOrders()
        retrySales()
      }}
    >
      {/* Sold = the payments registered today, split as Estadísticas splits them: cash in hand
          (cash and bank transfer) and credit. */}
      <CRow className="g-2">
        <CCol xs={12}>
          <StatTile
            emphasis
            label="Vendido"
            value={value(sales?.total, fmtMoney)}
            hint={
              sales
                ? `${sales.paidOrders} ${sales.paidOrders === 1 ? 'cobrada' : 'cobradas'}`
                : undefined
            }
          />
        </CCol>
        {/* Half a row each: the block is five twelfths of the page from `lg`, and three money
            tiles side by side ran their figures into the border. */}
        <CCol xs={6}>
          <StatTile
            label="Efectivo"
            value={value(sales?.cash, fmtMoney)}
            hint="Incluye transferencia"
          />
        </CCol>
        <CCol xs={6}>
          <StatTile label="Crédito" value={value(sales?.credit, fmtMoney)} />
        </CCol>
        <CCol xs={6}>
          <StatTile label="Órdenes nuevas" value={value(figures?.orders)} />
        </CCol>
        <CCol xs={6}>
          <StatTile label="Tableros" value={value(figures?.boards, (n) => fmtNumber(n, 1, 0))} />
        </CCol>
      </CRow>
    </Section>
  )
}

const StockSection = ({ branchId }: { branchId?: number }) => {
  const { counts, unchecked, failed, retry } = useStock(branchId)
  const total = counts ? counts.low + counts.out : undefined
  const hint = unchecked
    ? 'El inventario del proveedor no respondió.'
    : counts && counts.out > 0
      ? `${counts.out} ${counts.out === 1 ? 'agotado' : 'agotados'} y ${counts.low} por debajo del mínimo.`
      : undefined
  return (
    <Section title="Inventario" failed={failed} onRetry={retry}>
      <div className="home-rows">
        <HomeRow
          spec={{
            label: 'Stock bajo',
            hint: 'Tableros y tapacantos por debajo de su mínimo.',
            icon: 'lowStock',
            tone: counts && counts.out > 0 ? 'danger' : 'progress',
            to: lowStockLink(branchId),
          }}
          count={total}
          loading={!failed && !unchecked}
          hint={hint}
        />
      </div>
    </Section>
  )
}

const HomePage = () => {
  const user = useCurrentUser()
  const isAdmin = useHasRole('administrador')
  const { getParam, setParam } = useListParams()
  // The admin has no branch of their own and starts on all of them; the seller sees theirs.
  const branchId = isAdmin
    ? getParam('branchId')
      ? Number(getParam('branchId'))
      : undefined
    : (user?.branchId ?? undefined)
  const attention = useAttention(branchId)

  return (
    <div className="home">
      <HomeActions
        branchId={branchId}
        onBranchChange={
          isAdmin
            ? (next) => setParam('branchId', next === undefined ? undefined : String(next))
            : undefined
        }
      />
      {/* A seller with no branch gets a 403 on every listing: one notice, not four broken blocks. */}
      {isNoBranchError(attention.error) ? (
        <NoBranchNotice />
      ) : (
        <CRow className="g-3">
          <CCol lg={isAdmin ? 7 : 6} className="home-column">
            <AttentionSection branchId={branchId} attention={attention} />
            {isAdmin && <ProductionSection branchId={branchId} />}
          </CCol>
          <CCol lg={isAdmin ? 5 : 6} className="home-column">
            {isAdmin ? (
              <>
                <TodaySection branchId={branchId} />
                <StockSection branchId={branchId} />
              </>
            ) : (
              <ProductionSection branchId={branchId} />
            )}
          </CCol>
        </CRow>
      )}
    </div>
  )
}

export default HomePage
