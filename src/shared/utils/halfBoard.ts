const HALF_SUFFIX = ' (medio tablero)'

export const stripHalfSuffix = (name?: string) =>
  name?.endsWith(HALF_SUFFIX) ? name.slice(0, -HALF_SUFFIX.length) : name
