// Case- and accent-insensitive normalization for comparisons and search (Spanish locale).
// Decomposes to NFD and drops the combining marks, so "Melámina" and "melamina" compare equal.
export const normalizeText = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

// The catalogue prefixes every tapacanto's name with the word itself ("TAPACANTO IBIZA
// 19X0.40MM"): 10 of 25 characters, under a column or a label that already says what this is.
// What identifies the tape is the design and the size, so the word is dropped for display only —
// the stored name, the code and the search keep it.
export const stripBandingPrefix = (name: string): string =>
  name.replace(/^tapacantos?\s+/i, '') || name
