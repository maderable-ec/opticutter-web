import EmptyState from 'src/shared/components/EmptyState'
import StatusBadge from 'src/shared/components/StatusBadge'
import { LedgerItem, LedgerModal, LedgerSection, LedgerSummary } from './components/Ledger'
import { fmtInt, fmtWeekday } from './format'
import { groupByDay } from './ledger'
import {
  SHEET_KIND_LABEL,
  fmtWeight,
  sheetBadge,
  sheetMaterial,
  sheetPieces,
  sheetTime,
} from './operatorBoards'
import { useOperatorBoards } from './useAnalytics'

interface OperatorBoardsModalProps {
  userId: number | undefined
  from: string
  to: string
  branchId: number | undefined
  onClose: () => void
}

/**
 * The sheets behind one operator's row: every one they marked a piece on in the period, and why
 * it counts for them or not. It is how a figure gets checked against what the operator says they
 * cut — the credited sheets add up to the row's «Tableros», by construction, and the rest name who
 * closed them or what is still missing.
 */
const OperatorBoardsModal = ({ userId, from, to, branchId, onClose }: OperatorBoardsModalProps) => {
  const query = useOperatorBoards(userId, from, to, branchId)
  const data = query.data

  return (
    <LedgerModal
      open={userId != null}
      title={data ? `Tableros de ${data.fullName}` : 'Tableros del operador'}
      loading={query.isLoading}
      loadingLabel="Cargando sus tableros…"
      failed={query.isError || !data}
      onRetry={() => void query.refetch()}
      onClose={onClose}
    >
      {data && (
        <>
          <LedgerSummary rule="Una hoja cuenta cuando todas sus piezas están marcadas, el día de su última marca y para quien marcó esa última pieza. Un entero vale 1, un medio 0,5 y un retazo 0.">
            Cuentan <strong>{fmtWeight(data.boards)} tableros</strong> en{' '}
            {fmtInt(data.creditedCount)} {data.creditedCount === 1 ? 'hoja' : 'hojas'} ·{' '}
            {fmtInt(data.piecesCut)} piezas marcadas
          </LedgerSummary>
          {data.sheets.length === 0 ? (
            <EmptyState title="No marcó piezas en el período" />
          ) : (
            groupByDay(data.sheets, (s) => (s.status === 'credited' ? s.weight : 0)).map((day) => (
              <LedgerSection
                key={day.day}
                title={`${fmtWeekday(day.day)} · cuentan ${fmtWeight(day.sum)}`}
              >
                {day.items.map((s) => (
                  <LedgerItem
                    key={s.boardId}
                    orderId={s.orderId}
                    orderCode={s.orderCode}
                    badges={
                      <>
                        <span className="text-body-secondary">Hoja {s.sheetNumber}</span>
                        <StatusBadge config={{ [s.status]: sheetBadge(s) }} value={s.status} />
                      </>
                    }
                    figure={s.status === 'credited' ? `+${fmtWeight(s.weight)}` : '—'}
                    line={`${sheetMaterial(s)} · ${SHEET_KIND_LABEL[s.kind]}`}
                    clientName={s.clientName}
                    meta={
                      <>
                        <span>{sheetPieces(s)}</span>
                        <span>{sheetTime(s)}</span>
                      </>
                    }
                  />
                ))}
              </LedgerSection>
            ))
          )}
        </>
      )}
    </LedgerModal>
  )
}

export default OperatorBoardsModal
