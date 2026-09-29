import { describe, expect, it } from 'vitest'
import { emptyMaterial, emptyRequirement, sidesFromNotation } from './optimizerForm'
import { parsePieces, requirementsToCsv } from './piecesCsv'

describe('parsePieces', () => {
  it('skips the header and reads the Prioridad slot past', () => {
    const csv = [
      'Material,Largo,Ancho,Cantidad,Prioridad,Etiqueta,Rotar',
      'Melamina Blanca,800,600,4,1,Puerta,sí',
    ].join('\n')
    const { rows, warnings } = parsePieces(csv)
    expect(warnings).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      materialText: 'Melamina Blanca',
      height: 800,
      width: 600,
      quantity: 4,
      label: 'Puerta',
      canRotate: true,
    })
  })

  it('reads a spreadsheet paste with decimal commas', () => {
    const { rows } = parsePieces('MDF\t800,5\t600\t2\t\t\tno')
    expect(rows[0]).toMatchObject({ height: 800.5, width: 600, quantity: 2, canRotate: false })
  })

  it('reads the banding off the Etiqueta the way the workshop program writes it', () => {
    const { rows, canto } = parsePieces('MDF;800;600;3;;2L1C CS Lateral;no')
    expect(rows[0]?.canto?.notation).toBe('2L1C')
    expect(rows[0]?.canto?.bandType).toBe('Soft')
    expect(rows[0]?.label).toBe('Lateral')
    expect(canto.banded).toBe(3)
  })

  it('dedupes material names regardless of case and accents', () => {
    const { materialTexts } = parsePieces('Melamina,1,1,1\nmelámina,2,2,1')
    expect(materialTexts).toHaveLength(1)
    expect(materialTexts[0]?.count).toBe(2)
  })

  it('warns about a row with invalid measures', () => {
    const { warnings } = parsePieces('MDF,0,600,1')
    expect(warnings).toEqual(['Fila 1: medidas inválidas (largo/ancho).'])
  })
})

describe('requirementsToCsv', () => {
  it('exports a list that re-imports with its banding', () => {
    const material = { ...emptyMaterial(), label: 'Melamina, blanca' }
    const piece = {
      ...emptyRequirement(material.uid),
      height: 720,
      width: 350,
      quantity: 2,
      label: 'Lateral',
      canRotate: true,
      edgeBanding: { productId: '', sides: sidesFromNotation('1L1C'), bandType: 'Hard' as const },
    }
    const csv = requirementsToCsv([piece], [material], [])
    const { rows } = parsePieces(csv)
    expect(rows[0]).toMatchObject({
      materialText: 'Melamina, blanca',
      height: 720,
      width: 350,
      quantity: 2,
      label: 'Lateral',
      canRotate: true,
    })
    expect(rows[0]?.canto?.notation).toBe('1L1C')
    expect(rows[0]?.canto?.bandType).toBe('Hard')
  })
})
