import CuttingSettingsCard from './CuttingSettingsCard'
import PreorderSettingsCard from './PreorderSettingsCard'
import CompanySettingsCard from './CompanySettingsCard'

// Each card loads and saves its own section independently (separate GET/PATCH).
const SettingsPage = () => (
  <>
    <CuttingSettingsCard />
    <PreorderSettingsCard />
    <CompanySettingsCard />
  </>
)

export default SettingsPage
