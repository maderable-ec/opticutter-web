import CuttingSettingsCard from './CuttingSettingsCard'
import PreorderSettingsCard from './PreorderSettingsCard'
import CompanySettingsCard from './CompanySettingsCard'
import TaxSettingsCard from './TaxSettingsCard'
import StockSettingsCard from './StockSettingsCard'
import WorkScheduleSettingsCard from './WorkScheduleSettingsCard'

// Each card loads and saves its own section independently (separate GET/PATCH).
const SettingsPage = () => (
  <>
    <CuttingSettingsCard />
    <PreorderSettingsCard />
    <TaxSettingsCard />
    <StockSettingsCard />
    <WorkScheduleSettingsCard />
    <CompanySettingsCard />
  </>
)

export default SettingsPage
