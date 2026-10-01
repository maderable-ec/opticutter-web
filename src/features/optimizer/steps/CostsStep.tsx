import { CAlert, CRow } from '@coreui/react'

import { fmtMoney } from 'src/features/review/format'
import PricingBlock from 'src/shared/components/PricingBlock'
import PriceLevelToggle from 'src/features/optimizer/PriceLevelToggle'
import ServiceLines from 'src/features/preorders/ServiceLines'
import {
  pricingWithServices,
  servicesNetTotal,
  type ServiceLineForm,
} from 'src/features/preorders/useServiceLines'
import { useServices } from 'src/features/services/useServices'
import { KEY } from 'src/shared/utils/platform'
import type { ModalContainer, OptimizeResponse } from '../types'
import UnplacedPiecesAlert from '../UnplacedPiecesAlert'
import { EdgeBandingSummaryTable, Kpi, MaterialsSummaryTable } from '../summaryTables'
import Spinner from 'src/shared/components/Spinner'

// Step 3: what the plan costs. The plan itself is the step before (Optimización), so this one is
// money only — it used to open with the diagram's summary bar, back when the diagram was a modal
// behind it. Arriving here straight from Despiece (the trail allows it) still runs the search first,
// like arriving at Optimización does: the page's effect fires on every step that reads the result.
//
// The price level is chosen HERE rather than next to the client: it is the one input that changes
// these numbers, and picking it beside the tables it moves means the real cost is visible on the
// spot. The additional services are here for the same reason — they used to be reachable only from
// the pre-order detail page, so a quote built in the wizard was born without them.

interface CostsStepProps {
  // Absent until the first run lands.
  result?: OptimizeResponse
  // A cut SEARCH is in flight (the page shows the viewport overlay). A re-price (level, per-board
  // marks) is not this: it only moves the money and says so inline.
  isSearching: boolean
  error?: Error | null
  // The inputs changed since this result was computed; a fresh run is already on its way.
  isStale: boolean
  // Pieces with banding sides but no tapacanto product: their cost is missing from these tables,
  // which is exactly why they block the quote.
  missingBanding: number[]
  priceLevel: number
  // Recomputes the quote. Cheap despite being a round trip: `/optimize` is cached by input hash, so
  // changing only the level re-prices the same cut plan instead of searching again.
  onPriceLevelChange: (level: number) => void
  isPending: boolean
  // Per-board mark: the toggle picks the level, this says which boards are billed at it. Every
  // unmarked board stays at the list price. Re-prices through the same cached round trip.
  leveledKeys: Set<string>
  onToggleLevel: (materialKey: string) => void
  // Per-board "the client takes the whole board": promotes a sheet the optimizer billed as half.
  // Also a cached round trip — the plan is reshaped, never searched again.
  wholeBoardKeys: Set<string>
  onToggleWholeBoard: (materialKey: string) => void
  // Billed services, owned by the page so they survive stepping away and land in the autosave.
  services: ServiceLineForm[]
  onAddService: () => void
  onUpdateService: <K extends keyof ServiceLineForm>(
    uid: string,
    field: K,
    value: ServiceLineForm[K],
  ) => void
  onRemoveService: (uid: string) => void
  container?: ModalContainer
}

const CostsStep = ({
  result,
  isSearching,
  error,
  isStale,
  missingBanding,
  priceLevel,
  onPriceLevelChange,
  isPending,
  leveledKeys,
  onToggleLevel,
  wholeBoardKeys,
  onToggleWholeBoard,
  services,
  onAddService,
  onUpdateService,
  onRemoveService,
  container,
}: CostsStepProps) => {
  const boardsCost = result?.totalBoardsCost ?? 0
  const bandingCost = result?.totalEdgeBandingCost ?? 0

  // Queried here rather than in the page: this is server state, and the request should not go out
  // until someone actually reaches the step that spends it.
  const { data: catalogData } = useServices({ isActive: true, limit: 100 })
  const catalog = catalogData?.items ?? []

  const pricing = result?.pricing ? pricingWithServices(result.pricing, services) : undefined

  // No card and no "Costos" heading: the step trail says it. The KPI tiles and the tables carry
  // their own borders, so wrapping them in one more box only added a frame.
  return (
    <>
      {error && (
        <CAlert color="danger" className="py-2 small mb-3">
          {error.message || 'Error al optimizar. Intente nuevamente.'}
        </CAlert>
      )}

      {!result && !error && !isSearching && (
        <div className="text-body-secondary small">
          Todavía no hay un resultado. Usa “Optimizar” en el menú ⋮ ({`${KEY.mod}+${KEY.enter}`})
          para calcular la distribución de las piezas en los tableros y su costo.
        </div>
      )}

      {result && (
        <>
          {isStale && !isSearching && (
            <CAlert color="warning" className="py-2 small">
              Cambiaste el despiece desde este resultado. Vuelve a optimizar para verlo actualizado.
            </CAlert>
          )}

          {missingBanding.length > 0 && (
            <CAlert color="warning" className="py-2 small">
              {missingBanding.length === 1
                ? `La pieza #${missingBanding.map((i) => i + 1).join('')} tiene canto definido pero no seleccionaste el tapacanto.`
                : `Hay ${missingBanding.length} piezas con canto definido pero sin tapacanto (#${missingBanding
                    .map((i) => i + 1)
                    .join(', #')}).`}{' '}
              Su tapacanto no está costeado y no podrás crear la cotización hasta seleccionarlo —
              vuelve al paso Despiece.
            </CAlert>
          )}

          <CRow className="g-2 mb-3">
            <Kpi label="Tableros" value={fmtMoney(boardsCost)} />
            <Kpi label="Tapacanto" value={fmtMoney(bandingCost)} />
            {/* Net, like the two tiles beside it: they are the three parts of the
                subtotal, and a tile with tax inside would not add up to it. The
                services are typed tax-included below, which is exactly why this
                one has to say which number it is showing. */}
            <Kpi
              label="Servicios (sin IVA)"
              value={fmtMoney(servicesNetTotal(services, result.pricing?.taxRate ?? 0))}
            />
            <Kpi
              label="Total"
              emphasis
              value={pricing ? fmtMoney(pricing.total) : fmtMoney(boardsCost + bandingCost)}
            />
          </CRow>

          {/* Here as well as in Optimización: this is the step whose "Cotización ›" it locks, and
              the reason must sit where the button is refused. */}
          <UnplacedPiecesAlert
            unplaced={result.unplaced}
            materialsSummary={result.materialsSummary}
          />

          <div className="eyebrow mb-2">Materiales</div>
          <MaterialsSummaryTable
            rows={result.materialsSummary ?? []}
            leveledKeys={leveledKeys}
            onToggleLevel={onToggleLevel}
            wholeBoardKeys={wholeBoardKeys}
            onToggleWholeBoard={onToggleWholeBoard}
          />

          {result.edgeBandingsSummary?.length > 0 && (
            <>
              <div className="eyebrow mb-2">Tapacantos</div>
              <EdgeBandingSummaryTable rows={result.edgeBandingsSummary} />
            </>
          )}

          <div className="eyebrow mb-2">Servicios adicionales</div>
          <ServiceLines
            services={services}
            catalog={catalog}
            onAdd={onAddService}
            onUpdate={onUpdateService}
            onRemove={onRemoveService}
            container={container}
          />

          {/* The level picker sits WITH the totals, not on a toolbar above the tables. It is the one
              control that moves these numbers, and up there the user had to scroll past the whole
              cut list to change it and scroll back to read the effect. Segmented rather than a
              select: there are exactly three levels, so switching is one click and the
              alternatives stay visible. */}
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 border-top pt-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="eyebrow">Nivel de precio</span>
              <PriceLevelToggle
                value={priceLevel}
                onChange={onPriceLevelChange}
                disabled={isPending}
              />
              {isPending && (
                // The technical tone: the plan is being worked on, nothing is wrong.
                <span className="text-tech small d-flex align-items-center gap-1">
                  <Spinner size="sm" />
                  Recalculando…
                </span>
              )}
            </div>
            {pricing && <PricingBlock pricing={pricing} />}
          </div>
        </>
      )}
    </>
  )
}

export default CostsStep
