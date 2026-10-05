import { CChartLine } from '@coreui/react-chartjs'
import { useChartTheme } from '../useChartTheme'

interface LineChartFigureProps {
  // Names the one series; also the value column of the table.
  title: string
  // The first column of the table («Día», «Semana»).
  periodLabel: string
  labels: string[]
  values: number[]
  // A value as read (tooltip, table, description) and as an axis tick.
  format: (n: number) => string
  tick?: (n: number) => string
  // A count: whole-number ticks, never «0,5 órdenes».
  integer?: boolean
}

/**
 * One measure over time, on one axis. The trend chart it replaced drew four series on two y-scales
 * — dollars on the left, three counts on the right — so the lines crossed where two arbitrary scales
 * happened to meet, and on a phone the four-item legend took a third of the chart. One measure at a
 * time: the caller picks which.
 *
 * The canvas carries a text alternative, and the same numbers sit in a table behind «Ver datos»:
 * the hover tooltip enhances the chart, it is never the only way to read a value.
 */
const LineChartFigure = ({
  title,
  periodLabel,
  labels,
  values,
  format,
  tick = format,
  integer = false,
}: LineChartFigureProps) => {
  const theme = useChartTheme()
  const peak = values.reduce((best, v, i) => (v > (values[best] ?? -Infinity) ? i : best), 0)
  const description =
    values.length > 0
      ? `${title}, ${labels[0]} a ${labels[labels.length - 1]}. Máximo ${format(values[peak] ?? 0)} (${labels[peak]}). Los valores están en «Ver datos».`
      : title

  return (
    <figure className="report-chart">
      <div className="report-chart__canvas">
        <CChartLine
          // Remounts on a theme switch: every colour is read again from the tokens.
          key={theme.mode}
          wrapper={false}
          aria-label={description}
          data={{
            labels,
            datasets: [
              {
                label: title,
                data: values,
                borderColor: theme.accent,
                backgroundColor: theme.wash,
                fill: true,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0,
                pointHitRadius: 12,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: theme.accent,
                pointHoverBorderColor: theme.surface,
                pointHoverBorderWidth: 2,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => format(ctx.parsed.y ?? 0) } },
            },
            scales: {
              x: {
                grid: { display: false },
                border: { color: theme.grid },
                ticks: { color: theme.muted, maxRotation: 0, autoSkipPadding: 12 },
              },
              y: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: theme.grid },
                ticks: {
                  color: theme.muted,
                  maxTicksLimit: 5,
                  precision: integer ? 0 : undefined,
                  callback: (v) => tick(Number(v)),
                },
              },
            },
          }}
        />
      </div>
      <details className="report-chart__data">
        <summary>Ver datos</summary>
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <th scope="col">{periodLabel}</th>
              <th scope="col" className="text-end">
                {title}
              </th>
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={`${label}-${i}`}>
                <td>{label}</td>
                <td className="text-end">{format(values[i] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default LineChartFigure
