import { reviewPreOrder } from './fixtures/data'
import { expect, test } from './fixtures/test'

// The public review: no session at all, the token in the URL is the only credential.

const TOKEN = 'e2e-token'
const PATH = `/public/review/${TOKEN}`

test('el cliente confirma la cotización y ve el código de su orden', async ({ page, api }) => {
  const quote = reviewPreOrder()
  api.get(PATH, quote)
  api.post(`${PATH}/confirm`, {
    ...quote,
    status: 'confirmed',
    orderCode: 'ORD-000200',
    confirmedAt: new Date().toISOString(),
  })

  await page.goto(`/review/${TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Cotización PRE-000123' })).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  const modal = page.locator('.modal.show')
  const confirm = modal.getByRole('button', { name: 'Confirmar pedido' })
  // Confirming mints the order: it asks for the declaration first.
  await expect(confirm).toBeDisabled()
  await modal.getByLabel(/Declaro haber revisado/).check()
  await confirm.click()

  await expect(page.getByText('ORD-000200')).toBeVisible()
  expect(api.requests('POST', `${PATH}/confirm`)).toHaveLength(1)
  // The token is a credential: this page never loads PostHog.
  expect(api.ingest).toEqual([])
})

test('un enlace revocado dice que no es válido, sin detalles técnicos', async ({ page, api }) => {
  api.fail('GET', PATH, 404, [{ message: 'Review link not found', code: 'NOT_FOUND' }])

  await page.goto(`/review/${TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible()
  await expect(page.getByText('Review link not found')).toHaveCount(0)
})
