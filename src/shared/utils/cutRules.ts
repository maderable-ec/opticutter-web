// The millimetres of the two cut rules: how much the saw cuts short per side with a hard tape
// (`hardEdges.ts`) and how much larger it cuts every layer of an assembly (`assembly.ts`). They are
// cutting settings the admin edits (Configuración › Parámetros de corte); the despiece reads them
// from GET /optimize/cut-rules (`useCutRules`) for its live hint, and until they arrive shows the
// defaults. The API's twin is `opticutter-api/src/modules/optimizations/cut_rules.py`.

export interface CutRules {
  hardEdgeCutMm: number
  assemblyAllowanceMm: number
}

// The values the shop started with — the API's `LEGACY_CUT_RULES`.
export const DEFAULT_CUT_RULES: CutRules = { hardEdgeCutMm: 1, assemblyAllowanceMm: 5 }
