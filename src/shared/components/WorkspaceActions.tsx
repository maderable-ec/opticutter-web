import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import useUIStore from 'src/shared/store/uiStore'

/**
 * A workspace screen's own controls, drawn in the workspace's header (`WorkspaceHeader`): the
 * header stays on screen while the page scrolls, so what goes here is always one tap away. Renders
 * nothing where there is no such header (the office's shell, an immersive screen).
 */
const WorkspaceActions = ({ children }: { children: ReactNode }) => {
  const el = useUIStore((state) => state.workspaceActionsEl)
  return el ? createPortal(children, el) : null
}

export default WorkspaceActions
