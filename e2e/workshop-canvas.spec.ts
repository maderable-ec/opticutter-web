import type { Page } from '@playwright/test'
import { cuttingPlan, workshopQueueItem } from './fixtures/data'
import { expect, test } from './fixtures/test'

// The cutting canvas. It owns the whole viewport on the panel next to the saw (@taller), and it
// opens on a phone too (@movil), where its top bar takes two rows.

// The fixture's board carries a real catalogue name, of the long kind.
const MATERIAL = cuttingPlan().boards[0]?.productName ?? ''

// How far an element's text overflows its own box: 0 when it shows whole.
const hiddenPx = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => el.scrollWidth - el.clientWidth)

// The material is what the operador takes to the rack: whole, on its own row, and off the drawing.
const expectWholeMaterial = async (page: Page) => {
  const strip = page.locator('.workshop-boardname')
  await expect(strip).toHaveText(MATERIAL)
  expect(await hiddenPx(page, '.workshop-boardname')).toBeLessThanOrEqual(1)
  const box = await strip.boundingBox()
  const stage = await page.locator('.workshop-stage').boundingBox()
  expect(box && stage && box.y + box.height <= stage.y + 1).toBe(true)
}

test.describe('lienzo de corte', { tag: '@taller' }, () => {
  test.beforeEach(async ({ api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/41/cutting-plan', cuttingPlan())
  })

  test('entra en el panel sin scroll y nombra la orden entera', async ({ page }) => {
    await page.goto('/workshop/orders/41')
    await expect(page.getByRole('img', { name: /^Tablero 1:/ })).toBeVisible()

    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
    }))
    expect(overflow).toEqual({ x: 0, y: 0 })
    // The identity is the part of the bar allowed to give: the client and the reference wrap,
    // and the code and the status are never clipped mid-word.
    const identity = page.locator('.workshop-identity__line')
    await expect(identity).toContainText('ORD-000041')
    await expect(identity).toContainText('En proceso')
    expect(await hiddenPx(page, '.workshop-identity__line')).toBeLessThanOrEqual(1)
  })

  test('nombra el material del tablero entero, en su propia franja', async ({ page }) => {
    await page.goto('/workshop/orders/41')
    await expectWholeMaterial(page)
  })

  test('dice de quién es el trabajo y cuál, con la referencia', async ({ page }) => {
    await page.goto('/workshop/orders/41')
    const who = page.locator('.workshop-identity__who')
    await expect(who).toHaveText('María Fernanda Villavicencio Ortega · Cocina edificio Norte')
    expect(await hiddenPx(page, '.workshop-identity__who')).toBeLessThanOrEqual(1)
  })

  test('«Volver» lleva al operador a la cola del Taller, con ese nombre', async ({ page, api }) => {
    api.get('/orders/workshop-queue', [workshopQueueItem()])

    await page.goto('/workshop/orders/41')
    await page.getByRole('button', { name: 'Volver a Taller' }).click()
    await expect(page).toHaveURL(/\/workshop$/)
  })

  test('cuenta en palabras las piezas que faltan', async ({ page }) => {
    await page.goto('/workshop/orders/41')
    const { totalPieces, cutPieces } = cuttingPlan().progress
    await expect(page.locator('.workshop-actionbar')).toContainText(
      `Faltan ${totalPieces - cutPieces} piezas por cortar`,
    )
  })
})

test(
  'en el celular, la barra del lienzo va en dos filas y no recorta nada',
  { tag: '@movil' },
  async ({ page, api, loginAs }) => {
    await loginAs(['operador'])
    api.get('/orders/41/cutting-plan', cuttingPlan())

    await page.goto('/workshop/orders/41')
    const identity = page.locator('.workshop-identity__line')
    await expect(identity).toContainText('En proceso')
    expect(await hiddenPx(page, '.workshop-identity__line')).toBeLessThanOrEqual(1)

    // The pager sits under the identity, not beside it.
    const top = async (selector: string) => (await page.locator(selector).boundingBox())?.y ?? 0
    expect(await top('.workshop-pager')).toBeGreaterThan(await top('.workshop-identity'))

    // The client's whole name and the reference, which used to be cut and hidden on a phone.
    const who = page.locator('.workshop-identity__who')
    await expect(who).toHaveText('María Fernanda Villavicencio Ortega · Cocina edificio Norte')
    expect(await hiddenPx(page, '.workshop-identity__who')).toBeLessThanOrEqual(1)

    // On a phone the material broke off a third of its name.
    await expectWholeMaterial(page)
  },
)
