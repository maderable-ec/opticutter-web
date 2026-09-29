import type { Page } from '@playwright/test'
import type { MaterialForm, RequirementForm } from 'src/features/optimizer/optimizerForm'
import type { OptimizerAutosave } from 'src/features/optimizer/optimizerStorage'
import type { Product } from 'src/features/products/types'
import type { MockApi } from './api'
import { boardProduct, branch, edgeBandingProduct } from './data'

// The stubs a whole screen needs to load, shared by the specs and the UX captures.

export const BOARD = boardProduct()
export const TAPE = edgeBandingProduct()

/** A material group already on the catalog board, as the autosave stores it. */
export const boardMaterial = (overrides: Partial<MaterialForm> = {}): MaterialForm => ({
  uid: 'mat-e2e',
  boardId: BOARD.id,
  label: '',
  offcuts: [],
  fillOrder: 'auto',
  applyPriceLevel: false,
  wholeBoard: false,
  skipTrim: false,
  ...overrides,
})

/** A row of the pieces table. `canto` uses the Canto column's own notation. */
export const piece = (
  height: number,
  width: number,
  quantity: number,
  label: string,
  canto: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean } = {},
): RequirementForm => ({
  materialUid: 'mat-e2e',
  height,
  width,
  quantity,
  label,
  canRotate: false,
  edgeBanding: {
    productId: '',
    sides: { left: false, right: false, top: false, bottom: false, ...canto },
    bandType: Object.keys(canto).length > 0 ? 'Soft' : '',
  },
  specialEdges: [],
  hingingCode: '',
  groovingCode: '',
  assemblyCode: '',
  divisionCode: '',
})

/**
 * Opens `/optimizer` on a workspace of our own by writing the autosave before the app boots, which
 * is far cheaper than driving the material modal. It runs on every navigation of the page, so a
 * test that reloads to check what the autosave restored gets this seed back, not its own edits.
 */
export const seedOptimizer = async (
  page: Page,
  materials: MaterialForm[],
  requirements: RequirementForm[] = [],
) => {
  const autosave: OptimizerAutosave = {
    version: 1,
    savedAt: Date.now(),
    draftId: null,
    draftName: '',
    materials,
    requirements,
    services: [],
  }
  await page.addInitScript((data) => {
    localStorage.setItem('cutter:optimizer:autosave:v1', data)
  }, JSON.stringify(autosave))
}

/** `/optimizer` with an empty workspace: one board and one tape in the catalog, no drafts. */
export const stubOptimizer = (api: MockApi) =>
  api
    .list('/branches/', [branch()])
    .list('/optimization-drafts/', [])
    // `listAll` pages through `/products/?type=…`: one call per product type.
    .list<Product>('/products/', (req) =>
      new URL(req.url()).searchParams.get('type') === 'edge_banding' ? [TAPE] : [BOARD],
    )
    .get(`/products/${BOARD.id}/edge-bandings`, [TAPE])
    // The Costos step's service picker.
    .list('/additional-services/', [])
