import { describe, expect, it } from 'vitest'
import { hasWorkshopCodes, workshopCodesBare, workshopCodesLine } from './workshopCodes'

// Order and abbreviations mirror `WORKSHOP_CODE_FIELDS` / `labels._WORKSHOP_CODE_ABBR`.

describe('workshop codes', () => {
  // Declared out of order on purpose: the line follows WORKSHOP_CODES, not the object.
  const codes = { divisionCode: 'D1', hingingCode: ' B2 ', groovingCode: '', assemblyCode: null }

  it('writes each code after its service, in the canonical order', () => {
    expect(workshopCodesLine(codes)).toBe('Abis B2 · Div D1')
  })

  it('writes the codes bare for the operator board', () => {
    expect(workshopCodesBare(codes)).toBe('B2 · D1')
  })

  it('treats blank codes as no work', () => {
    expect(hasWorkshopCodes(codes)).toBe(true)
    expect(hasWorkshopCodes({ hingingCode: '  ', groovingCode: null })).toBe(false)
    expect(workshopCodesLine({})).toBe('')
  })
})
