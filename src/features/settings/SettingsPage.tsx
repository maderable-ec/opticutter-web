import CuttingSettingsCard from './CuttingSettingsCard'
import PreorderSettingsCard from './PreorderSettingsCard'
import CompanySettingsCard from './CompanySettingsCard'
import TaxSettingsCard from './TaxSettingsCard'
import StockSettingsCard from './StockSettingsCard'

// Each card loads and saves its own section independently (separate GET/PATCH).
const SettingsPage = () => (
  <>
    <CuttingSettingsCard />
    <PreorderSettingsCard />
    <TaxSettingsCard />
    <StockSettingsCard />
    <CompanySettingsCard />
  </>
)

export default SettingsPage
