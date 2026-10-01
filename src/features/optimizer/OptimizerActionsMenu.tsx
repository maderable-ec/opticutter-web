import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import Icon from 'src/shared/icons/Icon'
import type { ReactNode } from 'react'

import { KEY } from 'src/shared/utils/platform'
import type { ModalContainer } from './types'
import { useConfirm } from 'src/shared/hooks/useConfirm'
import Spinner from 'src/shared/components/Spinner'

// Every action that used to sit in a toolbar, in one menu. Two toolbars were removed for this: the
// page title's (fullscreen / drafts) and the pieces card header's (import / export / clear). What is
// left on screen is only what gets used constantly — "Agregar material" at the end of the list and
// the quick-entry input inside each group.
//
// Sections render only when their handlers are given, so the two pages that mount this share one
// menu without sharing an action: the optimizer gets "Trabajo" (drafts belong to its scratch
// workspace) and never "Documento"; the pre-order detail page gets "Documento" (review link,
// ver orden, delete — a saved quote is a document) and never "Trabajo".

interface OptimizerActionsMenuProps {
  // --- Piezas ---
  onImport?: () => void
  onExport?: () => void
  exportDisabled?: boolean
  onClear?: () => void
  // Wording differs: the optimizer also drops the material groups, pre-orders only the pieces.
  clearsMaterials?: boolean
  // --- Optimización (only the wizard's Optimización and Costos steps pass these) ---
  onOptimize?: () => void
  // A result is already on screen, so the run explores an alternative rather than being the first.
  hasResult?: boolean
  optimizeDisabled?: boolean
  isOptimizing?: boolean
  // Alternative-solution seed of the result on screen (0 = canonical).
  variant?: number
  onFind?: () => void
  // --- Vista ---
  onToggleCollapseAll?: () => void
  allCollapsed?: boolean
  collapseDisabled?: boolean
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
  // --- Trabajo ---
  onNew?: () => void
  onOpenDrafts?: () => void
  onSaveDraft?: () => void
  isSavingDraft?: boolean
  savedFlash?: boolean
  // --- Distribución (the pre-order, on a phone only) ---
  // «Otra alternativa». From `md` the pre-order's action bar carries it as a button; below, the bar
  // has room for one action beside «Actualizar cotización», so it moves in here — which is why the
  // section is `d-md-none`.
  onAlternative?: () => void
  alternativeDisabled?: boolean
  // --- Documento (only a saved quote has these; the optimizer's workspace is not a document yet) ---
  onViewOrder?: () => void
  onDelete?: () => void
  // Fullscreen portal target: document.body sits outside the fullscreen element, so a menu portaled
  // there mounts but is never painted.
  container?: ModalContainer
  // Placement class for the dropdown root, for call sites that need to push it within their own row.
  className?: string
}

// Muted shortcut hint pushed to the right of an item's label.
//
// Labels come from `KEY`, which names the modifiers for the keyboard in front of the user (Ctrl /
// Shift / Alt / Enter on Windows, ⌘ ⇧ ⌥ ↵ on a Mac). `text-nowrap` because the spelled-out Windows
// forms are wide enough to wrap onto a second line inside the menu.
const Hint = ({ children }: { children: ReactNode }) => (
  <span className="ms-auto ps-4 text-body-secondary small text-nowrap">{children}</span>
)

const OptimizerActionsMenu = ({
  onImport,
  onExport,
  exportDisabled,
  onClear,
  clearsMaterials,
  onOptimize,
  hasResult,
  optimizeDisabled,
  isOptimizing,
  variant = 0,
  onFind,
  onToggleCollapseAll,
  allCollapsed,
  collapseDisabled,
  onToggleFullscreen,
  isFullscreen,
  onNew,
  onOpenDrafts,
  onSaveDraft,
  isSavingDraft,
  savedFlash,
  onAlternative,
  alternativeDisabled,
  onViewOrder,
  onDelete,
  container,
  className,
}: OptimizerActionsMenuProps) => {
  const hasPieces = !!(onFind || onImport || onExport || onClear)
  const hasRun = !!onOptimize
  const hasView = !!(onToggleCollapseAll || onToggleFullscreen)
  const hasJob = !!(onNew || onOpenDrafts || onSaveDraft)
  const hasDoc = !!(onViewOrder || onDelete)

  const [confirm, confirmDialog] = useConfirm({ container })
  const handleClear = async () => {
    const ok = await confirm({
      title: clearsMaterials ? 'Vaciar el despiece' : 'Vaciar la lista de piezas',
      body: clearsMaterials
        ? 'Se quitan todas las piezas y los grupos de materiales.'
        : 'Se quitan todas las piezas de la lista.',
      // The pieces come back with Ctrl+Z; the material groups do not.
      note: clearsMaterials ? undefined : `Se puede deshacer con ${KEY.mod}+Z.`,
      confirmLabel: 'Vaciar',
      tone: 'danger',
    })
    if (ok) onClear?.()
  }

  return (
    <>
      <CDropdown alignment="end" portal container={container} className={className}>
        <CDropdownToggle color="secondary" variant="outline" caret={false} title="Acciones">
          <Icon name="overflow" />
        </CDropdownToggle>
        <CDropdownMenu style={{ minWidth: 260 }}>
          {hasPieces && (
            <>
              <CDropdownHeader className="text-body-secondary small">Piezas</CDropdownHeader>
              {onFind && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  onClick={onFind}
                >
                  <Icon name="search" className="me-2" />
                  Buscar pieza
                  <Hint>{`${KEY.mod}+F`}</Hint>
                </CDropdownItem>
              )}
              {onImport && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  onClick={onImport}
                >
                  <Icon name="upload" className="me-2" />
                  Importar / Pegar
                  <Hint>{`${KEY.mod}+I`}</Hint>
                </CDropdownItem>
              )}
              {onExport && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  disabled={exportDisabled}
                  onClick={onExport}
                >
                  <Icon name="download" className="me-2" />
                  Exportar CSV
                  <Hint>{`${KEY.mod}+${KEY.shift}+S`}</Hint>
                </CDropdownItem>
              )}
              {onClear && (
                <CDropdownItem as="button" type="button" onClick={() => void handleClear()}>
                  <Icon name="delete" className="me-2" />
                  Limpiar…
                </CDropdownItem>
              )}
            </>
          )}

          {hasPieces && hasRun && <CDropdownDivider />}

          {hasRun && (
            <>
              <CDropdownHeader className="text-body-secondary small">Optimización</CDropdownHeader>
              <CDropdownItem
                as="button"
                type="button"
                className="d-flex align-items-center"
                disabled={optimizeDisabled || isOptimizing}
                onClick={onOptimize}
                // Same reasoning the button carried: a plain re-run would return the identical
                // layout (the backend caches by input hash), so once a result exists this bumps
                // the alternative seed instead.
                title={
                  hasResult
                    ? 'Genera una distribución alternativa con las mismas piezas'
                    : 'Calcula la distribución de las piezas'
                }
              >
                {isOptimizing ? (
                  <Spinner size="sm" className="me-2" />
                ) : (
                  <Icon name={hasResult ? 'retry' : 'optimizer'} className="me-2" />
                )}
                {hasResult ? 'Volver a optimizar' : 'Optimizar'}
                {variant > 0 && <span className="ms-1 text-body-secondary">#{variant}</span>}
                <Hint>{`${KEY.mod}+${KEY.enter}`}</Hint>
              </CDropdownItem>
            </>
          )}

          {(hasPieces || hasRun) && hasView && <CDropdownDivider />}

          {hasView && (
            <>
              <CDropdownHeader className="text-body-secondary small">Vista</CDropdownHeader>
              {onToggleCollapseAll && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  disabled={collapseDisabled}
                  onClick={onToggleCollapseAll}
                >
                  <Icon name={allCollapsed ? 'expandAll' : 'collapseAll'} className="me-2" />
                  {allCollapsed ? 'Expandir todos' : 'Plegar todos'}
                  <Hint>{`${KEY.mod}+${KEY.shift}+E`}</Hint>
                </CDropdownItem>
              )}
              {onToggleFullscreen && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  onClick={onToggleFullscreen}
                >
                  <Icon name={isFullscreen ? 'exitFullscreen' : 'fullscreen'} className="me-2" />
                  {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  <Hint>{`${KEY.mod}+${KEY.shift}+F`}</Hint>
                </CDropdownItem>
              )}
            </>
          )}

          {(hasPieces || hasRun || hasView) && hasJob && <CDropdownDivider />}

          {hasJob && (
            <>
              <CDropdownHeader className="text-body-secondary small">Trabajo</CDropdownHeader>
              {onNew && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  onClick={onNew}
                >
                  <Icon name="add" className="me-2" />
                  Nuevo
                  <Hint>{`${KEY.mod}+${KEY.alt}+N`}</Hint>
                </CDropdownItem>
              )}
              {onOpenDrafts && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  onClick={onOpenDrafts}
                >
                  <Icon name="open" className="me-2" />
                  Borradores…
                  <Hint>{`${KEY.mod}+O`}</Hint>
                </CDropdownItem>
              )}
              {onSaveDraft && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  disabled={isSavingDraft}
                  onClick={onSaveDraft}
                >
                  {isSavingDraft ? (
                    <Spinner size="sm" className="me-2" />
                  ) : (
                    <Icon name={savedFlash ? 'check' : 'save'} className="me-2" />
                  )}
                  {savedFlash ? 'Guardado' : 'Guardar borrador'}
                  <Hint>{`${KEY.mod}+S`}</Hint>
                </CDropdownItem>
              )}
            </>
          )}

          {onAlternative && (
            <>
              {(hasPieces || hasRun || hasView || hasJob) && (
                <CDropdownDivider className="d-md-none" />
              )}
              <CDropdownHeader className="text-body-secondary small d-md-none">
                Distribución
              </CDropdownHeader>
              <CDropdownItem
                as="button"
                type="button"
                className="d-flex d-md-none align-items-center"
                disabled={alternativeDisabled}
                onClick={onAlternative}
              >
                <Icon name="alternative" className="me-2" />
                Otra alternativa
                {variant > 0 && <span className="ms-1 text-body-secondary">#{variant}</span>}
              </CDropdownItem>
              {hasDoc && <CDropdownDivider className="d-md-none" />}
            </>
          )}

          {(hasPieces || hasRun || hasView || hasJob) && hasDoc && <CDropdownDivider />}

          {/* Actions on the quote as a document rather than on its contents. These were four buttons
            on the pre-order's header card; none of them is used often enough to hold a permanent
            row, and "Eliminar" in particular should not be one click away from the save button.
            The review link is NOT among them any more: it is the quote's next step, so it lives on
            `PreOrderStatusStrip` beside the sentence that explains why — and one action wants one
            door, or the strip's guards (unsaved edits, a client with no phone) are bypassable from
            here. */}
          {hasDoc && (
            <>
              <CDropdownHeader className="text-body-secondary small">Documento</CDropdownHeader>
              {onViewOrder && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center"
                  onClick={onViewOrder}
                >
                  <Icon name="external" className="me-2" />
                  Ver orden
                </CDropdownItem>
              )}
              {onDelete && (
                <CDropdownItem
                  as="button"
                  type="button"
                  className="d-flex align-items-center text-danger"
                  onClick={onDelete}
                >
                  <Icon name="delete" className="me-2" />
                  Eliminar…
                </CDropdownItem>
              )}
            </>
          )}
        </CDropdownMenu>
      </CDropdown>
      {confirmDialog}
    </>
  )
}

export default OptimizerActionsMenu
