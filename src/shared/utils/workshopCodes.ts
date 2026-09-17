// Workshop codes of a cut-list piece: the shop's own work on it (abisagrado, ranurado, ensamble,
// división),
// typed by the seller as a code the workshop already knows. Free text on purpose — this app has no
// opinion on what a code means. A piece with any of them is what gives the order the "Adicionales"
// activity, and the bander's floors count exactly those pieces.
//
// The API's field names, in the order every surface prints them. The words match the backend's
// `workshop_codes_line` (optimizations/labels.py), so the PDF and the order detail read alike; the
// operator's board prints the codes bare (`workshopCodesBare`).
export type WorkshopCodeField = 'hingingCode' | 'groovingCode' | 'assemblyCode' | 'divisionCode'

export const WORKSHOP_CODES: { field: WorkshopCodeField; label: string; abbr: string }[] = [
  { field: 'hingingCode', label: 'Abisagrado', abbr: 'Abis' },
  { field: 'groovingCode', label: 'Ranurado', abbr: 'Ran' },
  { field: 'assemblyCode', label: 'Ensamble', abbr: 'Ens' },
  { field: 'divisionCode', label: 'División', abbr: 'Div' },
]

// Mirrors the API's `max_length`, so the input stops where the server would refuse.
export const WORKSHOP_CODE_MAX_LENGTH = 32

export type WorkshopCodes = Partial<Record<WorkshopCodeField, string | null>>

// "Abis B2 · Ran R1": each code after the service it belongs to (a code alone would not say whether
// the piece is hinged or grooved). '' for a piece with none.
export const workshopCodesLine = (codes: WorkshopCodes): string =>
  WORKSHOP_CODES.filter(({ field }) => codes[field]?.trim())
    .map(({ field, abbr }) => `${abbr} ${codes[field]?.trim()}`)
    .join(' · ')

// The codes alone, "B2 · R1", in the same order. For the operator's board: the shop already knows
// what each code means, and on a piece drawn a few centimetres wide the service word is the part
// that costs legibility without adding any.
export const workshopCodesBare = (codes: WorkshopCodes): string =>
  WORKSHOP_CODES.map(({ field }) => codes[field]?.trim())
    .filter(Boolean)
    .join(' · ')

export const hasWorkshopCodes = (codes: WorkshopCodes): boolean =>
  WORKSHOP_CODES.some(({ field }) => !!codes[field]?.trim())
