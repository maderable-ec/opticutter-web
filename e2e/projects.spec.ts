import type { PreOrderCreate } from 'src/features/preorders/types'
import type { Project, ProjectSummary } from 'src/features/projects/types'
import { client, minutesAgo, planResponse, preOrder, stockCheck } from './fixtures/data'
import { boardMaterial, piece, stubOptimizer } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// The designer draws a project in «Diseñar» and hands it to the sellers; a seller quotes it from the
// projects listing, and the quote carries the project's id.

const summary = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: 7,
  name: 'Cocina con isla',
  clientName: 'Sra. Pérez',
  notes: null,
  status: 'in_progress',
  ownerId: 1,
  ownerName: 'Pía Proyectista',
  readyAt: null,
  quotes: [],
  createdAt: minutesAgo(120),
  updatedAt: minutesAgo(30),
  ...overrides,
})

const detail = (overrides: Partial<ProjectSummary> = {}): Project => ({
  ...summary(overrides),
  payload: {
    version: 1,
    materials: [boardMaterial()],
    requirements: [piece(720, 560, 2, 'Lateral')],
    layoutAdjustments: null,
  },
})

test('el proyectista abre su proyecto, lo guarda y lo entrega a los vendedores', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['proyectista'], { user: { branchId: 1 } })
  stubOptimizer(api)
  api.list('/projects/', [summary()])
  api.get('/projects/7', detail())
  api.post('/optimize/', planResponse())
  api.put('/projects/7', detail())
  api.patch('/projects/7/status', detail({ status: 'ready', readyAt: minutesAgo(0) }))

  // Their home is their desk.
  await page.goto('/')
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.locator('.side-nav__create')).toHaveAccessibleName('Diseñar')
  const row = page.getByRole('row', { name: /Cocina con isla/ })
  await expect(row).toContainText('En curso')

  await row.getByRole('button', { name: 'Abrir' }).click()
  await expect(page).toHaveURL(/\/projects\/new/)
  await expect(page.getByText('Proyecto Cocina con isla')).toBeVisible()

  // A project ends at Costos: the seller is who quotes it.
  const trail = page.getByRole('navigation', { name: 'Pasos del optimizador' })
  await expect(trail.getByRole('button')).toHaveText(['1Despiece', '2Optimización', '3Costos'])
  await trail.getByRole('button', { name: 'Costos' }).click()

  const footer = page.locator('.action-bar')
  const ready = footer.getByRole('button', { name: 'Marcar como listo' })
  await expect(ready).toBeEnabled()
  // No services: the seller bills them when quoting.
  await expect(page.getByText('Servicios adicionales')).toHaveCount(0)

  await ready.click()
  await expect(page).toHaveURL(/\/projects$/)
  const saved = api.requests('PUT', '/projects/7')[0]?.postDataJSON() as Partial<Project>
  expect(saved.payload?.requirements).toEqual([
    expect.objectContaining({ height: 720, width: 560, quantity: 2 }),
  ])
  expect(api.requests('PATCH', '/projects/7/status')[0]?.postDataJSON()).toEqual({
    status: 'ready',
  })
  // The branch drafts and the services catalog are not the designer's to read.
  expect(api.requests('GET', '/optimization-drafts/')).toHaveLength(0)
  expect(api.requests('GET', '/additional-services/')).toHaveLength(0)
})

test('el vendedor cotiza un proyecto listo y la cotización lo recuerda', async ({
  page,
  api,
  loginAs,
}) => {
  await loginAs(['vendedor'], { user: { branchId: 1 } })
  stubOptimizer(api)
  api.list('/projects/', [summary({ status: 'ready', readyAt: minutesAgo(10) })])
  api.get('/projects/7', detail({ status: 'ready' }))
  api.post('/optimize/', planResponse())
  api.list('/clients/', [client()])
  api.post('/inventory/stock-check', stockCheck())
  api.post('/preorders/', preOrder({ projectId: 7 }))
  api.get('/preorders/123', preOrder({ projectId: 7 }))
  api.get('/preorders/123/review-link', {
    status: 'active',
    createdAt: minutesAgo(60),
    expiresAt: minutesAgo(-60 * 24 * 5),
    usedAt: null,
  })

  await page.goto('/projects')
  const row = page.getByRole('row', { name: /Cocina con isla/ })
  await expect(row).toContainText('Listo para cotizar')
  // The seller's listing opens on the queue.
  expect(
    new URL(api.requests('GET', '/projects/')[0]?.url() ?? '').searchParams.getAll('status'),
  ).toEqual(['ready'])
  await expect(row).toContainText('Pía Proyectista')
  await expect(row.getByRole('button', { name: 'Abrir' })).toHaveCount(0)

  await row.getByRole('button', { name: 'Cotizar' }).click()
  await expect(page).toHaveURL(/\/preorders\/new/)
  await expect(page.getByText('Cotizando el proyecto Cocina con isla')).toBeVisible()

  const trail = page.getByRole('navigation', { name: 'Pasos del optimizador' })
  await trail.getByRole('button', { name: 'Costos' }).click()
  const footer = page.locator('.action-bar')
  await footer.getByRole('button', { name: /Cotización/ }).click()

  await page.getByRole('button', { name: /Ana Pérez/ }).click()
  await footer.getByRole('button', { name: 'Crear cotización' }).click()

  await expect(page).toHaveURL(/\/preorders\/123$/)
  const sent = api.requests('POST', '/preorders/')[0]?.postDataJSON() as PreOrderCreate
  // The project's name starts as the quote's reference.
  expect(sent).toMatchObject({ clientId: 1, projectId: 7, notes: 'Cocina con isla' })
})
