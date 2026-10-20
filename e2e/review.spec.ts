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
  await expect(page.getByText('Por confirmar')).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  // A question, not a receipt: the dialog says the order is not confirmed yet, and its button is
  // the acceptance, enabled from the start (a disabled one read as «ya está»).
  const modal = page.getByRole('dialog', { name: '¿Confirmas tu pedido?' })
  await expect(modal.getByText('aún no está confirmado')).toBeVisible()
  await modal.getByRole('button', { name: 'Sí, confirmar pedido' }).click()

  // The confirmation takes the focus, so it is on screen however far down the client was.
  const done = page.locator('.review-confirmed')
  await expect(done).toBeFocused()
  await expect(done.getByText('¡Pedido confirmado!')).toBeVisible()
  await expect(done.getByText('ORD-000200')).toBeVisible()
  expect(api.requests('POST', `${PATH}/confirm`)).toHaveLength(1)
  // The token is a credential: this page never loads PostHog.
  expect(api.ingest).toEqual([])
})

test('cerrar la confirmación deja dicho que el pedido sigue sin confirmar', async ({
  page,
  api,
}) => {
  api.get(PATH, reviewPreOrder())

  await page.goto(`/review/${TOKEN}`)
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  const modal = page.getByRole('dialog', { name: '¿Confirmas tu pedido?' })
  await expect(modal).toBeVisible()

  // A stray tap outside does not dismiss a decision that is still open.
  await page.mouse.click(5, 5)
  await expect(modal).toBeVisible()

  await modal.getByRole('button', { name: 'Volver a revisar' }).click()
  await expect(modal).toBeHidden()
  await expect(page.getByRole('status').getByText('Tu pedido aún no está confirmado')).toBeVisible()
  expect(api.requests('POST', `${PATH}/confirm`)).toHaveLength(0)
})

test('un enlace revocado dice que no es válido, sin detalles técnicos', async ({ page, api }) => {
  api.fail('GET', PATH, 404, [{ message: 'Review link not found', code: 'NOT_FOUND' }])

  await page.goto(`/review/${TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible()
  await expect(page.getByText('Review link not found')).toHaveCount(0)
})
