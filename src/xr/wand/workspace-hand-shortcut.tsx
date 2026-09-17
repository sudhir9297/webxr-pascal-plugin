'use client'

import { createPortal } from '@react-three/fiber'
import { useXR, useXRInputSourceState, XRSpace } from '@react-three/xr'
import { SpatialButton } from './spatial-controls'
import { SpatialText } from './spatial-text'
import { useXRWorkspace } from './workspace-store'

/** A wrist control remains reachable when the floating panel is hidden or misplaced. */
export function WorkspaceHandShortcut() {
  const origin = useXR((state) => state.origin)
  const hand = useXRInputSourceState('hand', 'left')
  const visible = useXRWorkspace((state) => state.visible)
  const wrist = hand?.inputSource.hand?.get('wrist')
  if (!wrist || !origin) return null

  return createPortal(
    <XRSpace space={wrist}>
      <group
        name="xr-workspace-hand-shortcut"
        position={[0, 0.035, 0.04]}
        rotation={[-Math.PI / 2, 0, 0]}
        pointerEventsOrder={100}
        pointerEventsType={{ deny: 'grab' }}
      >
        <SpatialButton
          name="xr-workspace-hand-toggle"
          position={[0, 0, 0]}
          size={[0.12, 0.055]}
          onClick={() => useXRWorkspace.getState().toggle()}
        >
          <SpatialText color="#ffffff" fontSize={0.014} maxWidth={0.11} position={[0, 0, 0.012]}>
            {visible ? 'Hide panel' : 'Show panel'}
          </SpatialText>
        </SpatialButton>
        <SpatialButton
          name="xr-workspace-hand-rescue"
          position={[0, -0.065, 0]}
          size={[0.12, 0.055]}
          onClick={() => useXRWorkspace.getState().recall()}
        >
          <SpatialText color="#ffffff" fontSize={0.014} maxWidth={0.11} position={[0, 0, 0.012]}>
            Bring here
          </SpatialText>
        </SpatialButton>
      </group>
    </XRSpace>,
    origin,
  )
}
