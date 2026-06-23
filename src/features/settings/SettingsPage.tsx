import CuttingSettingsCard from './CuttingSettingsCard'
import PreorderSettingsCard from './PreorderSettingsCard'
import CompanySettingsCard from './CompanySettingsCard'
import PriceTiersSettingsCard from './PriceTiersSettingsCard'

// Each card loads and saves its own section independently (separate GET/PATCH).
const SettingsPage = () => (
  <>
    <CuttingSettingsCard />
    <PreorderSettingsCard />
    <PriceTiersSettingsCard />
    <CompanySettingsCard />
  </>
)

export default SettingsPage
