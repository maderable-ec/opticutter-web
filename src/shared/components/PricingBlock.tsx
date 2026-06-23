import { fmtMoney } from 'src/features/review/format'
import type { PricingData } from 'src/features/optimizer/types'

interface PricingBlockProps {
  pricing: PricingData
  currency?: string
}

const PricingBlock = ({ pricing, currency = 'USD' }: PricingBlockProps) => {
  const fmt = (n?: number) => fmtMoney(n, currency)
  const discountPct = Math.round(pricing.discountRate * 100)

  return (
    <div className="d-flex flex-column align-items-end gap-1 small">
      <div>
        <span className="text-body-secondary me-2">Subtotal:</span>
        <span>{fmt(pricing.subtotal)}</span>
      </div>
      {pricing.discountAmount !== 0 && (
        <div>
          <span className="text-body-secondary me-2">
            Descuento {pricing.priceTierName} (-{discountPct}%):
          </span>
          <span className="text-danger">-{fmt(pricing.discountAmount)}</span>
        </div>
      )}
      <div className="fs-5 fw-semibold">
        <span className="text-body-secondary me-2">Total:</span>
        <span>{fmt(pricing.total)}</span>
      </div>
    </div>
  )
}

export default PricingBlock
