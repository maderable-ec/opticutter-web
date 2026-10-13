import { useNavigate } from 'react-router-dom'
import { CButton } from '@coreui/react'

import BrandMark from 'src/shared/icons/BrandMark'
import Icon from 'src/shared/icons/Icon'
import { stateFor } from 'src/shared/hooks/useShellNav'
import type { Back, Workspace } from 'src/shared/navigation'
import useUIStore from 'src/shared/store/uiStore'

import ShellHeader from './ShellHeader'

// A workspace's header (the Taller's): the place's name under the brand's isotype where the office
// shows its breadcrumb, and no menu. The office roles get its way out at the left end, the corner
// where the canvas has its «‹» and a record has «‹ Órdenes» on a phone; the shop floor, whose whole
// app this is, has nowhere to leave to and gets none (`exitFor`).
//
// The same height as the office's header: the first row of the queue's cards has to fit under it
// on the 960×544 panel.
//
// The screen's own controls go in `.workspace-actions`, before the bell: the header publishes the
// element and the screen portals into it (`WorkspaceActions`), since `shared` cannot import a
// feature. There, a control stays within reach however far the queue is scrolled.
interface WorkspaceHeaderProps {
  workspace: Workspace
  exit: Back | null
}

const WorkspaceHeader = ({ workspace, exit }: WorkspaceHeaderProps) => {
  const navigate = useNavigate()
  const setActionsEl = useUIStore((state) => state.setWorkspaceActionsEl)

  return (
    <ShellHeader>
      {exit && (
        <CButton
          color="secondary"
          variant="outline"
          className="workspace-exit"
          // The label says what it does; where it goes is the origin's name, for the ear and for a
          // mouse. On the shop's panel nobody needs it: only the admin has the button.
          aria-label={`${workspace.exitLabel} y volver a ${exit.name}`}
          title={`Volver a ${exit.name}`}
          onClick={() => void navigate(exit.to, { state: stateFor(exit) })}
        >
          <Icon name="back" />
          <span className="d-none d-sm-inline">{workspace.exitLabel}</span>
          <span className="d-sm-none">Salir</span>
        </CButton>
      )}
      <div className="workspace-name me-auto">
        <BrandMark mark="sygnet" height={28} />
        {workspace.name}
      </div>
      <div className="workspace-actions" ref={setActionsEl} />
    </ShellHeader>
  )
}

export default WorkspaceHeader
