import type { BoardProduct } from 'src/features/products/types'
import { emptyRequirement, materialLabel } from './optimizerForm'
import type { MaterialForm, RequirementForm } from './optimizerForm'

// CSV/TSV import and export for the pieces list. No dependencies: the parser handles
// paste from Excel/Sheets (tab-delimited) and CSV files (comma or semicolon).
// Edge banding is not included in this format (it's a product + sides); it is edited per-row in its modal.

// Column order matches the visual order of the table.
export const CSV_COLUMNS = [
  'Material',
  'Largo',
  'Ancho',
  'Cantidad',
  'Prioridad',
  'Etiqueta',
  'Rotar',
] as const

// Known header words used to detect (and skip) a header row.
const HEADER_WORDS = [
  'material',
  'alto',
  'altura',
  'height',
  'ancho',
  'width',
  'cant',
  'cantidad',
  'qty',
  'quantity',
  'prior',
  'prioridad',
  'priority',
  'etiqueta',
  'label',
  'nombre',
  'rotar',
  'rotate',
  'giro',
]

const TRUE_WORDS = new Set(['si', 'sí', 'x', '1', 'true', 'verdadero', 'yes', '✓'])
const FALSE_WORDS = new Set(['no', '0', 'false', 'falso', ''])

const normalize = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Converts text to a number, accepting comma as decimal separator. Returns '' if not a number.
const parseNum = (s: string): number | string => {
  const t = s.trim().replace(',', '.')
  if (t === '') return ''
  const n = Number(t)
  return Number.isFinite(n) ? n : ''
}

// Detects the delimiter: tab (spreadsheet paste) takes priority; otherwise ';' or ','.
const detectDelimiter = (text: string): string => {
  if (text.includes('\t')) return '\t'
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const semis = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semis > commas ? ';' : ','
}

// Splits a line respecting double-quoted fields ("a,b" stays intact) and escaped quotes ("").
const splitLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
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

// Treat as a header if ≥2 cells exactly match a known word (avoids false positives
// for labels that happen to contain "alto", "ancho", etc.).
const looksLikeHeader = (cells: string[]): boolean => {
  const words = new Set(HEADER_WORDS)
  const hits = cells.filter((c) => words.has(normalize(c))).length
  return hits >= 2
}

// Resolves the Material column text against the loaded materials. No match → first material + warning.
const resolveMaterialUid = (
  text: string,
  materials: MaterialForm[],
  boards: BoardProduct[],
): { uid: string; matched: boolean } => {
  const target = normalize(text)
  if (target) {
    const match = materials.find(
      (m) =>
        normalize(materialLabel(m, boards)) === target ||
        (m.label.trim() !== '' && normalize(m.label) === target),
    )
    if (match) return { uid: match.uid, matched: true }
  }
  return { uid: materials[0]?.uid ?? '', matched: false }
}

export interface ParseResult {
  rows: RequirementForm[]
  warnings: string[]
}

// Parses pasted or file text into pieces resolved against `materials`. Collects human-readable warnings.
export const parsePieces = (
  text: string,
  materials: MaterialForm[],
  boards: BoardProduct[],
): ParseResult => {
  const warnings: string[] = []
  const rows: RequirementForm[] = []
  if (!text.trim()) return { rows, warnings }

  const delimiter = detectDelimiter(text)
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')

  lines.forEach((line, idx) => {
    const cells = splitLine(line, delimiter)
    if (idx === 0 && looksLikeHeader(cells)) return // skip header row

    const [material = '', alto = '', ancho = '', cant = '', prior = '', etiqueta = '', rotar = ''] =
      cells
    const lineNo = idx + 1

    const { uid, matched } = resolveMaterialUid(material, materials, boards)
    if (!matched && material.trim()) {
      warnings.push(
        `Fila ${lineNo}: material "${material.trim()}" no encontrado; se asignó el primero.`,
      )
    }

    const req = emptyRequirement(uid)
    req.height = parseNum(alto)
    req.width = parseNum(ancho)
    const q = parseNum(cant)
    req.quantity = q === '' ? 1 : q
    const p = parseNum(prior)
    req.priority = p === '' ? 0 : p
    req.label = etiqueta.trim()

    const rot = normalize(rotar)
    if (TRUE_WORDS.has(rot)) req.canRotate = true
    else if (FALSE_WORDS.has(rot)) req.canRotate = rot === '' ? req.canRotate : false

    if (Number(req.height) <= 0 || Number(req.width) <= 0) {
      warnings.push(`Fila ${lineNo}: medidas inválidas (largo/ancho).`)
    }
    rows.push(req)
  })

  return { rows, warnings }
}

const csvCell = (v: string | number): string => {
  const s = String(v)
  // Wrap in quotes if the value contains delimiters or quotes (standard CSV).
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Serializes the current list to CSV (comma-delimited, dot decimals, rotate as sí/no).
export const requirementsToCsv = (
  requirements: RequirementForm[],
  materials: MaterialForm[],
  boards: BoardProduct[],
): string => {
  const byUid = new Map(materials.map((m) => [m.uid, m]))
  const header = CSV_COLUMNS.join(',')
  const lines = requirements.map((r) => {
    const m = byUid.get(r.materialUid)
    const matName = m ? materialLabel(m, boards) : ''
    return [matName, r.height, r.width, r.quantity, r.priority, r.label, r.canRotate ? 'sí' : 'no']
      .map(csvCell)
      .join(',')
  })
  return [header, ...lines].join('\n')
}

// Triggers a CSV download without external libraries (Blob + temporary anchor).
export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
