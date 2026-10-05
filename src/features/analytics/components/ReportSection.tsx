import type { ReactNode } from 'react'
import Section from 'src/shared/components/Section'

interface ReportSectionProps {
  title: ReactNode
  // One line under the title: what the figures count, when the title alone would mislead.
  caption?: ReactNode
  // At the right of the title: the control that belongs to this block alone (a metric, a stage).
  // Full width under the title on a phone.
  control?: ReactNode
  // The previous result on screen while the new one loads (see `Section`).
  refreshing?: boolean
  className?: string
  children: ReactNode
}

// One block of a report: the shared `Section`, with its control laid out the reports' way.
const ReportSection = ({ control, ...props }: ReportSectionProps) => (
  <Section
    {...props}
    action={control && <div className="report-section__control">{control}</div>}
  />
)

export default ReportSection
