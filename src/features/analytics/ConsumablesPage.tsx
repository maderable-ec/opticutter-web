import { useId, useState } from 'react'
import {
  CButton,
  CFormLabel,
  CFormTextarea,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useActiveBranches } from 'src/features/branches/useBranches'
import { CONSUMABLE_ICON, CONSUMABLE_LABEL } from 'src/features/consumables/consumables'
import PastChangeModal from 'src/features/consumables/PastChangeModal'
import {
  consumedLine,
  currentLine,
  lifeEnd,
  lifeStart,
  lifeWhat,
  lifeWork,
  voidConsequence,
  yieldDetail,
  yieldLine,
} from 'src/features/consumables/report'
import type { ConsumableLife, ConsumableSummary } from 'src/features/consumables/types'
import {
  useConsumablesReport,
  useRegisterChange,
  useVoidChange,
} from 'src/features/consumables/useConsumables'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'
import EmptyState from 'src/shared/components/EmptyState'
import ListCard from 'src/shared/components/ListCard'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import Icon from 'src/shared/icons/Icon'
import { useToastStore } from 'src/shared/store/toastStore'
import ReportFilters from './components/ReportFilters'
import ReportSection from './components/ReportSection'
import { fmtDecimal } from './format'
import { useReportFilters } from './useReportFilters'

// Working hours, in hours: «52,5 h». Never in days — a day of work is not twenty-four of them.
const fmtH = (hours: number) => `${fmtDecimal(hours)} h`

const Consumable = ({ type }: { type: ConsumableSummary['type'] }) => (
  <span className="consumable-name">
    <Icon name={CONSUMABLE_ICON[type]} />
    {CONSUMABLE_LABEL[type]}
  </span>
)

// The yield and, under it, what it is made of (new against sharpened, the ones that broke).
const Yield = ({ summary }: { summary: ConsumableSummary }) => {
  const line = yieldLine(summary)
  const detail = yieldDetail(summary)
  if (!line && !detail) return <span className="text-body-secondary">—</span>
  return (
    <>
      {line ?? <span className="text-body-secondary">—</span>}
      {detail && <div className="small text-body-secondary">{detail}</div>}
    </>
  )
}

/**
 * Insumos: how many saw blades, scoring blades and kilos of glue the shop went through, and what
 * each one gave. The shop floor only registers the change; the metres are the saw's and the edge
 * bander's own, read between one change and the next, so a blade's figures and Producción's are
 * the same sheets.
 *
 * It is also where the office corrects the record: a change nobody registered is entered with its
 * date, and one registered by mistake is voided (the row stays, it stops counting).
 */
const ConsumablesPage = () => {
  const reasonId = useId()
  const filters = useReportFilters()
  const { from, to, branchId } = filters
  const report = useConsumablesReport(from, to, branchId)
  const branches = useActiveBranches()
  const register = useRegisterChange()
  const voidChange = useVoidChange()
  const addToast = useToastStore((s) => s.addToast)

  const [entering, setEntering] = useState(false)
  const [voiding, setVoiding] = useState<ConsumableLife | null>(null)
  const [reason, setReason] = useState('')

  const data = report.data
  const rows = data?.branches.flatMap((b) => b.items.map((item) => ({ branch: b, item }))) ?? []

  const startVoiding = (life: ConsumableLife) => {
    voidChange.reset()
    setReason('')
    setVoiding(life)
  }

  const lifeTitle = (life: ConsumableLife) => `${CONSUMABLE_LABEL[life.type]} · ${life.branchName}`

  return (
    <div className="report">
      <ReportFilters filters={filters} />

      {report.isLoading ? (
        <ReportSection title="Consumo y rendimiento">
          <LoadingBlock rows={6} label="Cargando los insumos…" />
        </ReportSection>
      ) : report.isError || !data ? (
        <ReportSection title="Consumo y rendimiento">
          <ErrorState onRetry={() => void report.refetch()} />
        </ReportSection>
      ) : (
        <>
          <ReportSection
            title="Consumo y rendimiento"
            caption="Usados: lo que se montó o se cargó en el período. Rendimiento: promedio de los que se retiraron en el período, sin contar los dañados. En uso: lo que hay hoy en la máquina."
            refreshing={report.isPlaceholderData}
          >
            <div className="d-md-none list-cards">
              {rows.map(({ branch, item }) => (
                <ListCard
                  key={`${branch.branchId}-${item.type}`}
                  title={`${CONSUMABLE_LABEL[item.type]} · ${branch.branchName}`}
                >
                  {/* One fact per line, each under its name: run together with dots, the three
                      read as one sentence nobody could scan. */}
                  <dl className="consumable-facts">
                    <div>
                      <dt>Usados</dt>
                      <dd>{consumedLine(item)}</dd>
                    </div>
                    <div>
                      <dt>Rendimiento</dt>
                      <dd>
                        <Yield summary={item} />
                      </dd>
                    </div>
                    <div>
                      <dt>En uso</dt>
                      <dd>{currentLine(item.current)}</dd>
                    </div>
                  </dl>
                </ListCard>
              ))}
            </div>
            <CTable align="middle" className="d-none d-md-table list-table rows-static mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell scope="col">Sucursal</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Insumo</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Usados</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Rendimiento</CTableHeaderCell>
                  <CTableHeaderCell scope="col">En uso</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map(({ branch, item }) => (
                  <CTableRow key={`${branch.branchId}-${item.type}`}>
                    <CTableDataCell>{branch.branchName}</CTableDataCell>
                    <CTableDataCell>
                      <Consumable type={item.type} />
                    </CTableDataCell>
                    <CTableDataCell>{consumedLine(item)}</CTableDataCell>
                    <CTableDataCell>
                      <Yield summary={item} />
                    </CTableDataCell>
                    <CTableDataCell>{currentLine(item.current)}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </ReportSection>

          <ReportSection
            title="Vida de cada insumo"
            caption="Del cambio que lo puso al cambio que lo retiró. Los retirados en el período y los que están en uso, los más recientes arriba."
            refreshing={report.isPlaceholderData}
            control={
              <CButton
                color="primary"
                variant="outline"
                onClick={() => {
                  register.reset()
                  setEntering(true)
                }}
              >
                <Icon name="add" className="me-1" />
                Registrar cambio pasado
              </CButton>
            }
          >
            {data.lives.length === 0 ? (
              <EmptyState
                title="Sin cambios registrados"
                hint="El taller registra cada cambio de sierra, de incisor y cada carga de goma desde «Insumos», en el Taller."
              />
            ) : (
              <>
                <div className="d-lg-none list-cards">
                  {data.lives.map((life) => (
                    <ListCard
                      key={life.changeId}
                      title={lifeTitle(life)}
                      badges={
                        life.inUse && (
                          <span className="badge status-pill status-pill--progress">En uso</span>
                        )
                      }
                      action={
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          aria-label={`Anular cambio de ${lifeTitle(life)}`}
                          onClick={() => startVoiding(life)}
                        >
                          Anular
                        </CButton>
                      }
                    >
                      <div className="list-card__meta">
                        <span>{lifeWork(life)}</span>
                        <span>
                          {lifeWhat(life)} · {lifeStart(life)}
                        </span>
                        {lifeEnd(life) && <span>Retirada: {lifeEnd(life)}</span>}
                        <span>{fmtH(life.workedHours)} laborables</span>
                      </div>
                    </ListCard>
                  ))}
                </div>
                <div className="d-none d-lg-block">
                  <CTable align="middle" hover responsive className="list-table rows-static">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell scope="col">Insumo</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Sucursal</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Puesta</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Retirada</CTableHeaderCell>
                        <CTableHeaderCell scope="col">Trabajo</CTableHeaderCell>
                        <CTableHeaderCell scope="col" className="text-end">
                          Horas laborables
                        </CTableHeaderCell>
                        <CTableHeaderCell scope="col">
                          <span className="visually-hidden">Acciones</span>
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {data.lives.map((life) => (
                        <CTableRow key={life.changeId}>
                          <CTableDataCell>
                            <Consumable type={life.type} />
                          </CTableDataCell>
                          <CTableDataCell>{life.branchName}</CTableDataCell>
                          <CTableDataCell>
                            {lifeWhat(life)}
                            <div className="small text-body-secondary">{lifeStart(life)}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            {lifeEnd(life) ?? (
                              <span className="badge status-pill status-pill--progress">
                                En uso
                              </span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-nowrap">{lifeWork(life)}</CTableDataCell>
                          <CTableDataCell className="text-end text-nowrap">
                            {fmtH(life.workedHours)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              aria-label={`Anular cambio de ${lifeTitle(life)}`}
                              onClick={() => startVoiding(life)}
                            >
                              Anular
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </>
            )}
          </ReportSection>
        </>
      )}

      <PastChangeModal
        visible={entering}
        branches={branches.data ?? []}
        branchId={branchId}
        pending={register.isPending}
        error={register.error}
        onConfirm={(change) =>
          register.mutate(change, {
            onSuccess: () => {
              addToast('Cambio registrado', 'success')
              setEntering(false)
            },
          })
        }
        onClose={() => setEntering(false)}
      />

      <ConfirmDialog
        visible={!!voiding}
        title={voiding ? `Anular cambio de ${CONSUMABLE_LABEL[voiding.type].toLowerCase()}` : ''}
        confirmLabel="Anular cambio"
        tone="danger"
        fullscreen="md"
        pending={voidChange.isPending}
        disabled={reason.trim().length === 0}
        error={voidChange.isError ? voidChange.error?.message : undefined}
        note="El registro no se borra: queda anulado, con quién lo anuló y por qué."
        onConfirm={() => {
          if (!voiding) return
          voidChange.mutate(
            { changeId: voiding.changeId, reason: reason.trim() },
            {
              onSuccess: () => {
                addToast('Cambio anulado', 'secondary')
                setVoiding(null)
              },
            },
          )
        }}
        onClose={() => setVoiding(null)}
      >
        {voiding && (
          <>
            <p>{voidConsequence(voiding)}</p>
            <CFormLabel htmlFor={reasonId}>
              ¿Por qué se anula? <span className="text-danger">*</span>
            </CFormLabel>
            <CFormTextarea
              id={reasonId}
              rows={2}
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej.: se registró por error, nadie cambió la sierra"
            />
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}

export default ConsumablesPage
