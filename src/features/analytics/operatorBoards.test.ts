import { describe, expect, it } from 'vitest'

import { groupByDay } from './ledger'
import { sheetBadge, sheetMaterial, sheetPieces } from './operatorBoards'
import type { OperatorBoard } from './types'

const sheet = (overrides: Partial<OperatorBoard> = {}): OperatorBoard => ({
  boardId: 1,
  orderId: 10,
  orderCode: 'ORD-000010',
  clientName: 'Carpintería Andes',
  branchName: 'Sucúa',
  sheetNumber: 1,
  materialName: 'MDP BLANCO 15 MM',
  width: 2440,
  height: 2140,
  kind: 'whole',
  weight: 1,
  day: '2026-10-06',
  piecesTotal: 12,
  piecesMine: 12,
  piecesMineInRange: 12,
  piecesByOthers: 0,
  piecesPending: 0,
  otherCutters: [],
  myLastCutAt: '2026-10-06T14:00:00Z',
  doneAt: '2026-10-06T14:00:00Z',
  closedBy: 'Leonardo',
  status: 'credited',
  ...overrides,
})

describe('a sheet of the ledger', () => {
  it('names what it is when the catalog does not', () => {
    expect(sheetMaterial(sheet())).toBe('MDP BLANCO 15 MM')
    expect(
      sheetMaterial(sheet({ materialName: null, kind: 'offcut', width: 485, height: 615 })),
    ).toBe('Retazo 485×615')
    expect(
      sheetMaterial(sheet({ materialName: null, kind: 'half', width: 1220.4, height: 2440 })),
    ).toBe('Medida manual 1220×2440')
  })

  it('says why it counts or not, with who and how many', () => {
    expect(sheetBadge(sheet()).label).toBe('Cuenta')
    expect(sheetBadge(sheet({ status: 'credited_to_other', closedBy: 'Luigi' })).label).toBe(
      'La cerró Luigi',
    )
    expect(sheetBadge(sheet({ status: 'incomplete', piecesPending: 1 })).label).toBe(
      'Falta 1 pieza',
    )
    expect(sheetBadge(sheet({ status: 'incomplete', piecesPending: 3 })).label).toBe(
      'Faltan 3 piezas',
    )
  })

  it('says who marked what on it', () => {
    expect(sheetPieces(sheet())).toBe('12 de 12 piezas suyas')
    expect(
      sheetPieces(
        sheet({
          piecesMine: 8,
          piecesMineInRange: 7,
          piecesByOthers: 3,
          piecesPending: 1,
          otherCutters: ['Luigi'],
        }),
      ),
    ).toBe('8 de 12 piezas suyas · 1 antes o después del período · 3 de Luigi · 1 sin marcar')
  })
})

describe('the ledger by day', () => {
  it('keeps the order and adds up what each day credits', () => {
    const days = groupByDay(
      [
        sheet({ boardId: 1, day: '2026-10-07', weight: 1 }),
        sheet({ boardId: 2, day: '2026-10-07', weight: 0.5, status: 'credited_to_other' }),
        sheet({ boardId: 3, day: '2026-10-06', weight: 0.5 }),
        sheet({ boardId: 4, day: '2026-10-06', weight: 0 }),
      ],
      (s) => (s.status === 'credited' ? s.weight : 0),
    )
    expect(days.map((d) => [d.day, d.items.length, d.sum])).toEqual([
      ['2026-10-07', 2, 1],
      ['2026-10-06', 2, 0.5],
    ])
  })
})
