import { describe, expect, it } from 'vitest'

import { fmtSheets } from './format'

// A part never splits: the number and its word are held by a no-break space.
const nb = (text: string) => text.replace(/(\d) /g, '$1\u00a0')

describe('the sheets behind a board count', () => {
  it('lists the whole boards, the halves and the retazos', () => {
    expect(fmtSheets({ whole: 11, half: 3, offcut: 4 })).toBe(
      nb('11 enteros · 3 medios · 4 retazos'),
    )
  })

  it('says one in the singular', () => {
    expect(fmtSheets({ whole: 1, half: 1, offcut: 1 })).toBe(nb('1 entero · 1 medio · 1 retazo'))
  })

  it('leaves a kind with none out', () => {
    expect(fmtSheets({ whole: 12, half: 0, offcut: 0 })).toBe(nb('12 enteros'))
    expect(fmtSheets({ whole: 0, half: 2, offcut: 5 })).toBe(nb('2 medios · 5 retazos'))
  })

  it('says nothing when no sheet was processed, or the API does not send them', () => {
    expect(fmtSheets({ whole: 0, half: 0, offcut: 0 })).toBeUndefined()
    expect(fmtSheets(undefined)).toBeUndefined()
  })

  it('groups the thousands like every other figure', () => {
    expect(fmtSheets({ whole: 1240, half: 0, offcut: 0 })).toMatch(/^1\.240\u00a0enteros$/)
  })
})
