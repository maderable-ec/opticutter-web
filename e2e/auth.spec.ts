import { stubHome } from './fixtures/scenarios'
import { expect, test } from './fixtures/test'

// Who lands where. A wrong role does not error: the route guard silently redirects to the role's
// home, which is exactly why it deserves a test.

test('el operador aterriza en el tablero de taller', async ({ page, api, loginAs }) => {
  await loginAs(['operador'])
  api.get('/orders/workshop-queue', [])

  await page.goto('/')
  await expect(page).toHaveURL(/\/workshop$/)
  await expect(page.getByText('No hay órdenes en el taller.')).toBeVisible()
})

for (const roles of [['vendedor'], ['administrador']] as const) {
  test(`el ${roles[0]} aterriza en Inicio`, async ({ page, api, loginAs }) => {
    await loginAs([...roles], { user: { branchId: 1 } })
    stubHome(api, { admin: roles[0] === 'administrador' })

    await page.goto('/')
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByRole('heading', { name: 'Requiere atención' })).toBeVisible()
  })
}

test('una ruta de otro rol devuelve al inicio del rol', async ({ page, api, loginAs }) => {
  await loginAs(['operador', 'canteador'])
  api.get('/orders/workshop-queue', [])

  await page.goto('/orders')
  await expect(page).toHaveURL(/\/workshop$/)
})

test('una sesión de otro día se cierra y pide login', async ({ page, loginAs }) => {
  await loginAs(['vendedor'], { loginDate: '2020-01-01' })

  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login$/)
})
