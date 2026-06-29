import type { ProductPayload } from './types'

export const PRODUCT_CSV_COLUMNS = [
  'Tipo',
  'Código',
  'Nombre',
  'Descripción',
  'Precio',
  'Activo',
  'Alto',
  'Ancho',
  'Grosor',
  'Largo',
  'DireccionGrano',
  'TipoTapacanto',
  'Color',
] as const

const TYPE_MAP: Record<string, 'board' | 'edge_banding'> = {
  tablero: 'board',
  board: 'board',
  tapacanto: 'edge_banding',
  edge_banding: 'edge_banding',
}

const TRUE_WORDS = new Set(['si', 'sí', 's', 'yes', '1', 'true', 'verdadero', '✓'])

const HEADER_WORDS = [
  'tipo', 'type', 'codigo', 'código', 'code', 'nombre', 'name', 'precio', 'price',
  'activo', 'active', 'alto', 'height', 'ancho', 'width', 'grosor', 'thickness',
  'largo', 'length', 'color',
]

const normalize = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')

const parseNum = (s: string): number | undefined => {
  const t = s.trim().replace(',', '.')
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

const detectDelimiter = (text: string): string => {
  if (text.includes('\t')) return '\t'
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const semis = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semis > commas ? ';' : ','
}

const splitLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      cells.push(cur)
      cur = ''
    } else cur += ch
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

const looksLikeHeader = (cells: string[]): boolean => {
  const words = new Set(HEADER_WORDS)
  return cells.filter((c) => words.has(normalize(c))).length >= 2
}

export interface ProductParseResult {
  rows: ProductPayload[]
  warnings: string[]
}

export const parseProducts = (text: string): ProductParseResult => {
  const warnings: string[] = []
  const rows: ProductPayload[] = []
  if (!text.trim()) return { rows, warnings }

  const delimiter = detectDelimiter(text)
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')

  lines.forEach((line, idx) => {
    const cells = splitLine(line, delimiter)
    if (idx === 0 && looksLikeHeader(cells)) return

    const [
      tipo = '', codigo = '', nombre = '', descripcion = '', precio = '', activo = '',
      alto = '', ancho = '', grosor = '', largo = '', direccionGrano = '', tipoTapacanto = '', color = '',
    ] = cells
    const lineNo = idx + 1

    const productType = TYPE_MAP[normalize(tipo)]
    if (!productType) {
      warnings.push(
        `Fila ${lineNo}: tipo "${tipo.trim() || '(vacío)'}" no reconocido; se esperaba "tablero" o "tapacanto". Fila omitida.`,
      )
      return
    }

    const code = codigo.trim()
    if (!code) {
      warnings.push(`Fila ${lineNo}: código vacío. Fila omitida.`)
      return
    }

    const name = nombre.trim()
    if (!name) {
      warnings.push(`Fila ${lineNo}: nombre vacío. Fila omitida.`)
      return
    }

    const price = parseNum(precio)
    if (price === undefined) {
      warnings.push(
        `Fila ${lineNo}: precio "${precio.trim() || '(vacío)'}" no es un número válido. Fila omitida.`,
      )
      return
    }

    const activoNorm = normalize(activo)
    const isActive = activoNorm === '' ? true : TRUE_WORDS.has(activoNorm)

    const payload: ProductPayload = {
      code,
      name,
      description: descripcion.trim() || null,
      type: productType,
      price,
      isActive,
      attributes:
        productType === 'board'
          ? {
              height: parseNum(alto),
              width: parseNum(ancho),
              thickness: parseNum(grosor),
              grainDirection: direccionGrano.trim() || undefined,
            }
          : {
              thickness: parseNum(grosor),
              width: parseNum(ancho),
              length: parseNum(largo),
              bandType: tipoTapacanto.trim() || undefined,
              color: color.trim() || undefined,
            },
    }

    rows.push(payload)
  })

  return { rows, warnings }
}

const csvCell = (v: string | number | undefined | null): string => {
  if (v === undefined || v === null) return ''
  const s = String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const downloadProductTemplate = (): void => {
  const header = PRODUCT_CSV_COLUMNS.join(',')
  const exampleRows = [
    ['tablero', 'TAB-001', 'Melamina Blanca', '', '15000', 'si', '2440', '1220', '18', '', 'longitudinal', '', ''],
    ['tapacanto', 'TAP-001', 'Tapacanto Blanco 22mm', '', '500', 'si', '', '22', '0.5', '50', '', 'Soft', 'Blanco'],
  ]
  const csv = [header, ...exampleRows.map((r) => r.map(csvCell).join(','))].join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_productos.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
