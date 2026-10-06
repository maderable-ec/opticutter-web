const DEVELOPER_URL = 'https://dbsiavichay.dev/es'

// The developer's credit, on the login and at the foot of the user menu. The name links to the
// developer's site in a new tab, in the colour of the line around it (`text-reset`): it is a
// credit, not an action, so only the underline says it can be followed.
const PoweredBy = () => (
  <>
    Powered by{' '}
    <a href={DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="text-reset">
      Denis Siavichay
    </a>
  </>
)

export default PoweredBy
