// The detail behind a person's row in Productividad, by business day: each day says what it adds to
// the row's main figure (a seller's money, an operator's boards, a bander's tape).

export interface LedgerDay<T> {
  day: string
  items: T[]
  sum: number
}

// In the API's order (newest first): consecutive items of a day stay together.
export const groupByDay = <T extends { day: string }>(
  items: T[],
  figure: (item: T) => number,
): LedgerDay<T>[] => {
  const days: LedgerDay<T>[] = []
  for (const item of items) {
    let day = days.at(-1)
    if (day?.day !== item.day) {
      day = { day: item.day, items: [], sum: 0 }
      days.push(day)
    }
    day.items.push(item)
    day.sum += figure(item)
  }
  return days
}
