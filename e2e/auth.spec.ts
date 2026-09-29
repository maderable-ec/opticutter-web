import { expect, test } from './fixtures/test'

// Who lands where. A wrong role does not error: the route guard silently redirects to the role's
// home, which is exactly why it deserves a test.

test('el operador aterriza en el tablero de taller', async ({ page, api, loginAs }) => {
  await loginAs(['operador'])
  api.get('/orders/workshop-queue', [])

  await page.goto('/')
  await expect(page).toHaveURL(/\/workshop-board$/)
  await expect(page.getByText('No hay órdenes en el tablero.')).toBeVisible()
})

test('una ruta de otro rol devuelve al inicio del rol', async ({ page, api, loginAs }) => {
  await loginAs(['operador', 'canteador'])
  api.get('/orders/workshop-queue', [])

  await page.goto('/orders')
  await expect(page).toHaveURL(/\/workshop-board$/)
})

test('una sesión de otro día se cierra y pide login', async ({ page, loginAs }) => {
  await loginAs(['vendedor'], { loginDate: '2020-01-01' })

  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login$/)
})
