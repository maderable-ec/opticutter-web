import { useId } from 'react'
import type { ReactNode } from 'react'
import {
  CButton,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import Icon from 'src/shared/icons/Icon'
import type { IconName } from 'src/shared/icons/registry'
import { MASK } from 'src/shared/analytics'
import { apiErrorMessage } from 'src/shared/api/errors'
import EmptyState from 'src/shared/components/EmptyState'
import ListCard from 'src/shared/components/ListCard'
import ListToolbar from 'src/shared/components/ListToolbar'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import RecordLink from 'src/shared/components/RecordLink'
import ReferenceNote from 'src/shared/components/ReferenceNote'
import SearchInput from 'src/shared/components/SearchInput'
import Spinner from 'src/shared/components/Spinner'
import StatusBadge from 'src/shared/components/StatusBadge'
import { useConfirm } from 'src/shared/hooks/useConfirm'
import { useListParams } from 'src/shared/hooks/useListParams'
import { useToastStore } from 'src/shared/store/toastStore'
import { fmtDate } from 'src/shared/utils/format'
import { useHasRole } from 'src/features/auth/useAuth'

import {
  PROJECT_QUOTE_ROLES,
  PROJECT_STATUS_CONFIG,
  PROJECT_VIEWS,
  PROJECT_WRITE_ROLES,
  defaultProjectView,
  projectActions,
  viewStatuses,
} from './status'
import type { ProjectAction } from './status'
import type { ProjectSummary } from './types'
import { useOpenProject } from './useOpenProject'
import { useProjects, useSetProjectStatus } from './useProjects'

const FILTER_KEYS = ['q', 'status']

// The designers' projects. One page for two people: the designer's desk (their own projects, opened
// in «Diseñar», reopened, archived) and the sellers' queue (the ready ones, quoted from here). The
// API decides whose rows these are; `projectActions` decides which buttons each row gets.
//
// A project has no page of its own: what there is to do with one is on its row.
const ProjectsPage = () => {
  const canWrite = useHasRole(...PROJECT_WRITE_ROLES)
  const canQuote = useHasRole(...PROJECT_QUOTE_ROLES)
  // The designer only ever sees their own: the column would repeat their name on every row.
  const showOwner = useHasRole('administrador', 'vendedor')
  const statusId = useId()
  const addToast = useToastStore((s) => s.addToast)
  const [confirm, confirmDialog] = useConfirm()
  const { openProject, startProject, openingId, dialog: openDialog } = useOpenProject()
  const setStatus = useSetProjectStatus()

  const { getParam, setParam, clearParams, offset, setOffset, limit, setLimit } = useListParams()
  const search = getParam('q')
  const defaultView = defaultProjectView(canWrite)
  const view = getParam('status') || defaultView

  const { data, isLoading, isError, refetch } = useProjects({
    status: viewStatuses(view),
    search: search || undefined,
    offset,
    limit,
  })
  const items = data?.items ?? []
  const isFiltered = search !== '' || view !== defaultView

  const failed = (error: Error) =>
    addToast(apiErrorMessage(error, 'No se pudo cambiar el proyecto.') ?? '', 'danger')

  // Back to the drawing board. From `ready` it also leaves the sellers' queue, so that one asks.
  const reopen = async (project: ProjectSummary) => {
    if (
      project.status === 'ready' &&
      !(await confirm({
        title: 'Reabrir proyecto',
        body: (
          <>
            <strong {...MASK}>{project.name}</strong> vuelve a estar en curso y sale de la lista de
            los vendedores hasta que lo marques como listo otra vez.
          </>
        ),
        confirmLabel: 'Reabrir',
        tone: 'primary',
      }))
    )
      return
    setStatus.mutate({ id: project.id, status: 'in_progress' }, { onError: failed })
  }

  const archive = async (project: ProjectSummary) => {
    const ok = await confirm({
      title: 'Archivar proyecto',
      body: (
        <>
          <strong {...MASK}>{project.name}</strong> sale de la lista de trabajo. Se puede reabrir
          desde «Archivados».
        </>
      ),
      confirmLabel: 'Archivar',
      tone: 'danger',
    })
    if (ok) setStatus.mutate({ id: project.id, status: 'archived' }, { onError: failed })
  }

  const busy = (project: ProjectSummary) =>
    openingId === project.id || (setStatus.isPending && setStatus.variables?.id === project.id)

  const actionButton = (project: ProjectSummary, action: ProjectAction, main: boolean) => {
    const common = { size: 'sm' as const, disabled: busy(project), className: 'text-nowrap' }
    const spinning = openingId === project.id && (action === 'open' || action === 'quote')
    const labels: Record<ProjectAction, { icon: IconName; text: string }> = {
      quote: { icon: 'createQuote', text: 'Cotizar' },
      open: { icon: 'open', text: 'Abrir' },
      reopen: { icon: 'reopenProject', text: 'Reabrir' },
      archive: { icon: 'archiveProject', text: 'Archivar' },
    }
    const onClick = {
      quote: () => openProject(project, 'quote'),
      open: () => openProject(project, 'edit'),
      reopen: () => void reopen(project),
      archive: () => void archive(project),
    }[action]
    return (
      <CButton
        key={action}
        {...common}
        color={main ? 'primary' : 'secondary'}
        variant={main ? undefined : 'outline'}
        onClick={onClick}
      >
        {spinning ? (
          <Spinner size="sm" className="me-1" />
        ) : (
          <Icon name={labels[action].icon} className="me-1" />
        )}
        {labels[action].text}
      </CButton>
    )
  }

  const actionsOf = (project: ProjectSummary): ReactNode => {
    const actions = projectActions(project.status, { canWrite, canQuote })
    if (actions.length === 0) return null
    return (
      <div className="d-flex flex-wrap gap-2 justify-content-md-end">
        {actions.map((action, i) => actionButton(project, action, i === 0))}
      </div>
    )
  }

  // The quotes made from it: links for whoever can open a quote, plain codes otherwise.
  const quotesOf = (project: ProjectSummary): ReactNode =>
    project.quotes.length === 0 ? (
      <span className="text-body-secondary">—</span>
    ) : (
      <span className="d-inline-flex flex-wrap gap-2">
        {project.quotes.map((quote) =>
          canQuote ? (
            <RecordLink key={quote.id} to={`/preorders/${quote.id}`}>
              {quote.code ?? `#${quote.id}`}
            </RecordLink>
          ) : (
            <span key={quote.id} className="text-nowrap">
              {quote.code ?? `#${quote.id}`}
            </span>
          ),
        )}
      </span>
    )

  const emptyState = isFiltered ? (
    <EmptyState
      icon="clearFilters"
      title="Ningún proyecto coincide con los filtros."
      action={
        <CButton color="secondary" variant="outline" onClick={() => clearParams(FILTER_KEYS)}>
          Limpiar filtros
        </CButton>
      }
    />
  ) : canWrite ? (
    <EmptyState
      title="No hay proyectos en curso."
      hint="Usa «Nuevo proyecto» para dibujar uno en el optimizador."
    />
  ) : (
    <EmptyState title="No hay proyectos listos para cotizar." />
  )

  return (
    <div className="surface">
      <ListToolbar>
        <SearchInput
          value={search}
          onChange={(value) => setParam('q', value, { replace: true })}
          placeholder="Buscar por proyecto o cliente…"
        />
        <CFormSelect
          id={statusId}
          aria-label="Estado"
          className="w-auto"
          value={view}
          // The role's own view stays out of the URL, as a default does everywhere else.
          onChange={(e) => setParam('status', e.target.value === defaultView ? '' : e.target.value)}
        >
          {PROJECT_VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </CFormSelect>
        {canWrite && (
          <CButton color="primary" className="ms-auto" onClick={startProject}>
            <Icon name="add" className="me-1" />
            Nuevo proyecto
          </CButton>
        )}
      </ListToolbar>

      <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
        <div className="d-md-none">
          {items.length === 0 ? (
            emptyState
          ) : (
            <div className="list-cards">
              {items.map((project) => (
                <ListCard
                  key={project.id}
                  title={<span {...MASK}>{project.name}</span>}
                  badges={<StatusBadge config={PROJECT_STATUS_CONFIG} value={project.status} />}
                  meta={
                    <>
                      {showOwner && <span>{project.ownerName ?? 'Sin proyectista'}</span>}
                      <span>Actualizado el {fmtDate(project.updatedAt)}</span>
                    </>
                  }
                >
                  {project.clientName && <div {...MASK}>{project.clientName}</div>}
                  {project.quotes.length > 0 && <div className="small">{quotesOf(project)}</div>}
                  {/* The card holds no link of its own, so its buttons can live inside it. */}
                  <div className="mt-2">{actionsOf(project)}</div>
                </ListCard>
              ))}
            </div>
          )}
        </div>

        <div className="d-none d-md-block">
          <CTable align="middle" responsive className="list-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Proyecto</CTableHeaderCell>
                <CTableHeaderCell>Estado</CTableHeaderCell>
                {showOwner && (
                  <CTableHeaderCell className="d-none d-lg-table-cell">
                    Proyectista
                  </CTableHeaderCell>
                )}
                <CTableHeaderCell>Cotizaciones</CTableHeaderCell>
                <CTableHeaderCell className="d-none d-lg-table-cell">Actualizado</CTableHeaderCell>
                <CTableHeaderCell>
                  <span className="visually-hidden">Acciones</span>
                </CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={showOwner ? 6 : 5} className="p-0">
                    {emptyState}
                  </CTableDataCell>
                </CTableRow>
              ) : (
                items.map((project) => (
                  <CTableRow key={project.id}>
                    <CTableDataCell>
                      {/* Named by the designer, often after the client: masked in session replay. */}
                      <div className="fw-semibold" {...MASK}>
                        {project.name}
                      </div>
                      {project.clientName && (
                        <div className="small text-body-secondary" {...MASK}>
                          {project.clientName}
                        </div>
                      )}
                      <ReferenceNote notes={project.notes} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <StatusBadge config={PROJECT_STATUS_CONFIG} value={project.status} />
                    </CTableDataCell>
                    {showOwner && (
                      <CTableDataCell className="d-none d-lg-table-cell">
                        {project.ownerName ?? '—'}
                      </CTableDataCell>
                    )}
                    <CTableDataCell>{quotesOf(project)}</CTableDataCell>
                    <CTableDataCell className="d-none d-lg-table-cell text-nowrap">
                      {fmtDate(project.updatedAt)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">{actionsOf(project)}</CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        </div>
      </QueryState>

      <Pagination
        offset={offset}
        limit={limit}
        total={data?.pagination.total}
        onChange={setOffset}
        onLimitChange={setLimit}
      />
      {openDialog}
      {confirmDialog}
    </div>
  )
}

export default ProjectsPage
