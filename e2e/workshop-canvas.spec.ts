import { cuttingPlan, workshopQueueItem } from './fixtures/data'
import { expect, test } from './fixtures/test'

// The cutting canvas. It owns the whole viewport on the panel next to the saw (@taller), and it
// opens on a phone too (@movil), where its top bar takes two rows.

test.describe('lienzo de corte', { tag: '@taller' }, () => {
  test.beforeEach(async ({ api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/41/cutting-plan', cuttingPlan())
  })

  test('entra en el panel sin scroll y nombra la orden entera', async ({ page }) => {
    await page.goto('/orders/41/workshop')
    await expect(page.getByRole('img', { name: /^Tablero 1:/ })).toBeVisible()

    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
    }))
    expect(overflow).toEqual({ x: 0, y: 0 })
    // The identity is the part of the bar allowed to shrink: it must shrink by truncating the
    // client's name, never by clipping the code or the status mid-word.
    const identity = page.locator('.workshop-identity__line')
    await expect(identity).toContainText('ORD-000041')
    await expect(identity).toContainText('En proceso')
    const clipped = await identity.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(clipped).toBeLessThanOrEqual(1)
  })

  test('«Volver» lleva al operador a la cola del Taller, con ese nombre', async ({ page, api }) => {
    api.get('/orders/workshop-queue', [workshopQueueItem()])

    await page.goto('/orders/41/workshop')
    await page.getByRole('button', { name: 'Volver a Taller' }).click()
    await expect(page).toHaveURL(/\/workshop-board$/)
  })

  test('cuenta en palabras las piezas que faltan', async ({ page }) => {
    await page.goto('/orders/41/workshop')
    const { totalPieces, cutPieces } = cuttingPlan().progress
    await expect(page.locator('.workshop-actionbar')).toContainText(
      `Faltan ${totalPieces - cutPieces} piezas por cortar`,
    )
  })
})

test(
  'en el celular, la barra del lienzo va en dos filas y no recorta el estado',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/41/cutting-plan', cuttingPlan())

    await page.goto('/orders/41/workshop')
    const identity = page.locator('.workshop-identity__line')
    await expect(identity).toContainText('En proceso')
    const clipped = await identity.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(clipped).toBeLessThanOrEqual(1)

    // The pager sits under the identity, not beside it.
    const top = async (selector: string) => (await page.locator(selector).boundingBox())?.y ?? 0
    expect(await top('.workshop-pager')).toBeGreaterThan(await top('.workshop-identity'))
  },
)
