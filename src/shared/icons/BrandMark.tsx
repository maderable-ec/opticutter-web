import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

// The brand's two marks are drawings, not icons: they keep their own viewBox and colours (the coral
// «BLE»), so they bypass Lucide. Each asset is `[viewBox size, svg markup]`, written in this repo.
const MARKS = { logo, sygnet }

interface BrandMarkProps {
  mark: keyof typeof MARKS
  // The width follows from the viewBox.
  height: number
  className?: string
}

const BrandMark = ({ mark, height, className }: BrandMarkProps) => {
  const [size, markup] = MARKS[mark]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${size}`}
      height={height}
      className={`brand-mark${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: markup ?? '' }}
    />
  )
}

export default BrandMark
