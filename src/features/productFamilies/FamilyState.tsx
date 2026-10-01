import Icon from 'src/shared/icons/Icon'

// Whether a family coordinates, as a state: a tone, an icon and the words. «Coordinada» was a solid
// green badge and each problem a solid amber one, told apart by colour alone — and the amber badge
// put white text on a light fill. The listing's row and the family's own dialog say it the same way.
const FamilyState = ({ issues }: { issues: string[] }) =>
  issues.length === 0 ? (
    <span className="badge status-pill status-pill--success">
      <Icon name="ok" className="status-pill__icon" />
      Coordinada
    </span>
  ) : (
    <span className="d-inline-flex flex-wrap gap-1">
      {issues.map((issue) => (
        <span key={issue} className="badge status-pill status-pill--progress">
          <Icon name="warning" className="status-pill__icon" />
          {issue}
        </span>
      ))}
    </span>
  )

export default FamilyState
