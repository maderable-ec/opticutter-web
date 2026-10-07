import type { ReactNode } from 'react'
import { CButton, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'

import { MASK } from 'src/shared/analytics'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { Modal, ModalTitle } from 'src/shared/components/Modal'
import { ErrorState } from 'src/shared/components/QueryState'
import RecordLink from 'src/shared/components/RecordLink'

// The pieces every detail of Productividad is built from: a dialog with the row's figures and the
// rule that counts them on top, then the records behind them by day. The three details differ in
// what a record is (a sale, a sheet, a banding), never in how they read.

interface LedgerModalProps {
  open: boolean
  title: string
  loading: boolean
  loadingLabel: string
  failed: boolean
  onRetry: () => void
  onClose: () => void
  children?: ReactNode
}

export const LedgerModal = ({
  open,
  title,
  loading,
  loadingLabel,
  failed,
  onRetry,
  onClose,
  children,
}: LedgerModalProps) => (
  <Modal visible={open} onClose={onClose} size="lg" scrollable fullscreen="md">
    <CModalHeader>
      <ModalTitle>{title}</ModalTitle>
    </CModalHeader>
    <CModalBody>
      {loading ? (
        <LoadingBlock rows={4} label={loadingLabel} />
      ) : failed ? (
        <ErrorState onRetry={onRetry} />
      ) : (
        children
      )}
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" onClick={onClose}>
        Cerrar
      </CButton>
    </CModalFooter>
  </Modal>
)

// The row's figures, and the rule that counts them: what a person disputes is usually the rule.
export const LedgerSummary = ({ children, rule }: { children: ReactNode; rule: string }) => (
  <>
    <p className="ledger__summary">{children}</p>
    <p className="ledger__rule">{rule}</p>
  </>
)

export const LedgerSection = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
  <section className="ledger__section">
    <h3 className="eyebrow">{title}</h3>
    <ul className="ledger__list">{children}</ul>
  </section>
)

interface LedgerItemProps {
  orderId: number
  orderCode: string | null
  // Beside the code: the sheet's number, a status, a kind of work.
  badges?: ReactNode
  // At the end of the first line: what the record adds to the row.
  figure: ReactNode
  // The line under the code: a material, a client.
  line?: ReactNode
  clientName: string
  // Short facts, separated by the dots of `.list-card__meta`.
  meta: ReactNode
}

// One record: its order (a link, so the figure can be chased into the order itself), what it adds,
// and the facts that explain it. The client is masked in session recordings, like everywhere else.
export const LedgerItem = ({
  orderId,
  orderCode,
  badges,
  figure,
  line,
  clientName,
  meta,
}: LedgerItemProps) => (
  <li className="ledger__item">
    <div className="ledger__head">
      <RecordLink to={`/orders/${orderId}`}>{orderCode ?? `#${orderId}`}</RecordLink>
      {badges}
      <strong className="ledger__figure">{figure}</strong>
    </div>
    {line && <div>{line}</div>}
    <div className="list-card__meta">
      {meta}
      <span {...MASK}>{clientName}</span>
    </div>
  </li>
)
