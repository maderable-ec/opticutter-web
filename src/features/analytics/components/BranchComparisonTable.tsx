import type { CSSProperties } from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { leaderIndex, type Better } from '../comparison'
import type { BranchFigures } from '../types'

export interface ComparisonRow {
  label: string
  value: (figures: BranchFigures) => number
  // The figure as printed; it also gets the whole figures, for a value that means nothing on its
  // own (an average start with no day worked).
  format: (value: number, figures: BranchFigures) => string
  // A second, quieter line under the figure: its share of the branch's total.
  detail?: (figures: BranchFigures) => string | undefined
  better: Better
}

export interface ComparisonGroup {
  title: string
  rows: ComparisonRow[]
}

interface BranchComparisonTableProps {
  branches: BranchFigures[]
  total: BranchFigures
  groups: ComparisonGroup[]
  // What the table compares, for a screen reader (the section's title says it to the eye).
  caption: string
}

interface FigureProps {
  row: ComparisonRow
  figures: BranchFigures
  lead?: boolean
}

// The figure, the leader's mark (shape and weight, never colour alone) and the quiet share under it.
const Figure = ({ row, figures, lead = false }: FigureProps) => {
  const detail = row.detail?.(figures)
  return (
    <>
      <span className={`comparison__value${lead ? ' is-lead' : ''}`}>
        {lead && <span className="comparison__lead" aria-hidden="true" />}
        {row.format(row.value(figures), figures)}
        {lead && <span className="visually-hidden"> (lidera)</span>}
      </span>
      {detail && <span className="comparison__detail">{detail}</span>}
    </>
  )
}

/**
 * Branch against branch, with the total last: the first thing the admin reads.
 *
 * One column per branch, in the API's order and with none named in the code. Each row marks the
 * branch that leads it — the most sold, the fewest hours stopped — so «who is doing better» is read
 * without comparing digits; a tie or an empty row marks nobody. From `md` a table; on a phone, the
 * same rows as small grids, since four columns of money do not fit 360 px.
 */
const BranchComparisonTable = ({
  branches,
  total,
  groups,
  caption,
}: BranchComparisonTableProps) => {
  const leaders = (row: ComparisonRow) => leaderIndex(branches.map(row.value), row.better)

  return (
    <>
      <div className="d-none d-md-block">
        <CTable align="middle" className="list-table rows-static comparison-table">
          <caption className="visually-hidden">{caption}</caption>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell scope="col">Indicador</CTableHeaderCell>
              {branches.map((b) => (
                <CTableHeaderCell key={b.branchId} scope="col" className="text-end">
                  {b.branchName}
                </CTableHeaderCell>
              ))}
              <CTableHeaderCell scope="col" className="text-end">
                Total
              </CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          {groups.map((group) => (
            <CTableBody key={group.title}>
              <CTableRow className="comparison-table__group">
                <CTableHeaderCell scope="colgroup" colSpan={branches.length + 2}>
                  {group.title}
                </CTableHeaderCell>
              </CTableRow>
              {group.rows.map((row) => {
                const lead = leaders(row)
                return (
                  <CTableRow key={row.label}>
                    <CTableHeaderCell scope="row" className="comparison-table__label">
                      {row.label}
                    </CTableHeaderCell>
                    {branches.map((b, i) => (
                      <CTableDataCell key={b.branchId} className="text-end">
                        <Figure row={row} figures={b} lead={i === lead} />
                      </CTableDataCell>
                    ))}
                    <CTableDataCell className="text-end comparison-table__total">
                      <Figure row={row} figures={total} />
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          ))}
        </CTable>
      </div>

      <div className="d-md-none comparison-cards">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h3 className="eyebrow comparison-cards__title">{group.title}</h3>
            {group.rows.map((row) => {
              const lead = leaders(row)
              return (
                <div key={row.label} className="comparison-cards__row">
                  <div className="comparison-cards__label">{row.label}</div>
                  <dl
                    className="comparison-cards__values"
                    style={{ '--columns': branches.length + 1 } as CSSProperties}
                  >
                    {branches.map((b, i) => (
                      <div key={b.branchId}>
                        <dt>{b.branchName}</dt>
                        <dd>
                          <Figure row={row} figures={b} lead={i === lead} />
                        </dd>
                      </div>
                    ))}
                    <div className="comparison-cards__total">
                      <dt>Total</dt>
                      <dd>
                        <Figure row={row} figures={total} />
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </section>
        ))}
      </div>
      <p className="comparison__legend">
        <span className="comparison__lead" aria-hidden="true" /> lidera la fila
      </p>
    </>
  )
}

export default BranchComparisonTable
