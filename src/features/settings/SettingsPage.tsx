import CuttingSettingsCard from './CuttingSettingsCard'
import CompanySettingsCard from './CompanySettingsCard'

// Each card loads and saves its own section independently (separate GET/PATCH).
const SettingsPage = () => (
  <>
    <CuttingSettingsCard />
    <CompanySettingsCard />
  </>
)

export default SettingsPage
