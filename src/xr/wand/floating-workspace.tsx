'use client'

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { isXRInputSourceState, useXR, useXRInputSourceState } from '@react-three/xr'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Group, Matrix4, type Mesh, Vector3 } from 'three'
import { useWebXRSceneLayers } from '../layers'
import { isQuestYPressed } from '../controller-buttons'
import { useXRPlayerMode } from '../mode-switching/store/player-mode'
import type { XRWandAdapter } from './adapter'
import { XRWandBuildPanel } from './build-panel'
import { XRWandPaintPanel } from './paint-panel'
import { XR_WAND_PANEL_INPUT_NAME } from './panel-layout'
import { useXRWandPanelSettings } from './panel-settings'
import { XRWandSettingsPanel } from './settings-panel'
import { PanelIcon } from './panel-icon'
import { PanelFace, SpatialButton } from './spatial-controls'
import { XR_WAND_THEME } from './theme'
import {
  placeWorkspace,
  workspaceParentPoint,
  WORKSPACE_CONTENT_SCALE,
  WorkspaceDrag,
} from './workspace-placement'
import { useXRWorkspace } from './workspace-store'

type PointerDownEvent = ThreeEvent<PointerEvent>
type WorkspaceTab = 'paint' | 'build' | 'settings'
const TABS = ['paint', 'build', 'settings'] as const
// Keep the first control visually aligned with the top of the 1.04 m rail.
const RAIL_TOP = 0.49
const RAIL_ITEM_GAP = 0.03
const RAIL_ITEM_HEIGHT = 0.105
const DRAG_AREA_Y = -0.64

function RailButton({
  iconSrc,
  name,
  y,
  selected,
  onClick,
}: {
  iconSrc: string
  name: string
  y: number
  selected?: boolean
  onClick: () => void
}) {
  return (
    <SpatialButton
      name={name}
      onClick={onClick}
      position={[0, y, 0]}
      selected={selected}
      size={[0.115, 0.105]}
    >
      <PanelIcon positionY={0} size={0.066} src={iconSrc} />
    </SpatialButton>
  )
}

export function XRFloatingWorkspace({ adapter }: { adapter: XRWandAdapter }) {
  const root = useRef<Group>(null)
  const handle = useRef<Mesh>(null)
  const camera = useThree((state) => state.camera)
  const session = useXR((state) => state.session)
  const referenceSpace = useXR((state) => state.originReferenceSpace)
  const origin = useXR((state) => state.origin)
  const playerMode = useXRPlayerMode((state) => state.mode)
  const controller = useXRInputSourceState('controller', 'left')
  const { overlay } = useWebXRSceneLayers()
  const panelScale = useXRWandPanelSettings((state) => state.panelScale)
  const handledRecall = useRef(-1)
  const recallButtonPressed = useRef(false)
  const drag = useRef(new WorkspaceDrag())
  const dragSource = useRef<XRInputSource | null>(null)
  const eye = useRef(new Vector3())
  const viewerMatrix = useRef(new Matrix4())
  const viewerTracked = useRef(false)
  const direction = useRef(new Vector3())
  const target = useRef(new Vector3())
  const localPoint = useRef(new Vector3())
  const localEye = useRef(new Vector3())
  const [tab, setTab] = useState<WorkspaceTab>('build')
  const [dragging, setDragging] = useState(false)

  const endDrag = useCallback(() => {
    const pointerId = drag.current.pointerId
    if (pointerId === null) return
    drag.current.end(pointerId)
    handle.current?.releasePointerCapture?.(pointerId)
    dragSource.current = null
    if (root.current) root.current.userData.dragging = false
    setDragging(false)
  }, [])

  useEffect(() => endDrag(), [endDrag, playerMode])

  useEffect(() => {
    const endSelection = (event: XRInputSourceEvent) => {
      if (event.inputSource === dragSource.current) endDrag()
    }
    const visibilityChanged = () => {
      if (session?.visibilityState !== 'visible') endDrag()
    }
    session?.addEventListener('selectend', endSelection)
    session?.addEventListener('end', endDrag)
    session?.addEventListener('visibilitychange', visibilityChanged)
    return () => {
      session?.removeEventListener('selectend', endSelection)
      session?.removeEventListener('end', endDrag)
      session?.removeEventListener('visibilitychange', visibilityChanged)
      endDrag()
    }
  }, [endDrag, session])

  useFrame((_, __, frame) => {
    const group = root.current
    if (!group) return
    // The host renderer reparents its stereo camera during rendering. Read the
    // XR viewer pose directly so event handlers never apply the origin twice.
    if (session) {
      const pose = frame && referenceSpace && frame.getViewerPose(referenceSpace)
      viewerTracked.current = !!pose && !!origin
      if (!pose || !origin) {
        endDrag()
        return
      }
      origin.updateWorldMatrix(true, false)
      viewerMatrix.current.fromArray(pose.transform.matrix).premultiply(origin.matrixWorld)
      eye.current.setFromMatrixPosition(viewerMatrix.current)
      direction.current.set(0, 0, -1).transformDirection(viewerMatrix.current)
    } else {
      camera.getWorldPosition(eye.current)
      camera.getWorldDirection(direction.current)
      viewerTracked.current = true
    }
    const pressed = isQuestYPressed(controller)
    if (pressed && !recallButtonPressed.current) useXRWorkspace.getState().recall()
    recallButtonPressed.current = pressed

    const source = dragSource.current
    if (
      drag.current.pointerId !== null &&
      source &&
      (!session ||
        !Array.from(session.inputSources).includes(source) ||
        (frame && referenceSpace && !frame.getPose(source.targetRaySpace, referenceSpace)))
    )
      endDrag()

    // Read the store here so controller recall and pointer recall share one path.
    const request = useXRWorkspace.getState().recallRequest
    if (drag.current.pointerId !== null) {
      workspaceParentPoint(group, eye.current, localEye.current)
      drag.current.maintain(drag.current.pointerId, localEye.current, group.position)
      localEye.current.y = group.position.y
      group.lookAt(localEye.current)
      return
    }
    if (handledRecall.current === request) return
    // Wait for an actual XR frame before initial placement.
    if (session && !frame) return
    placeWorkspace(eye.current, direction.current, target.current)
    workspaceParentPoint(group, target.current, group.position)
    group.updateWorldMatrix(true, false)
    group.getWorldPosition(target.current)
    target.current.set(eye.current.x, target.current.y, eye.current.z)
    group.lookAt(target.current)
    group.visible = true
    handledRecall.current = request
  }, -55)

  const startDrag = (event: PointerDownEvent) => {
    event.stopPropagation()
    if (!root.current || !viewerTracked.current) return
    workspaceParentPoint(root.current, eye.current, localEye.current)
    if (
      !viewerTracked.current ||
      !drag.current.start(
        event.pointerId,
        workspaceParentPoint(root.current, event.point, localPoint.current),
        root.current.position,
        localEye.current,
      )
    )
      return
    event.object.setPointerCapture?.(event.pointerId)
    root.current.userData.dragging = true
    if ('pointerState' in event && isXRInputSourceState(event.pointerState)) {
      dragSource.current = event.pointerState.inputSource
    }
    setDragging(true)
  }

  const moveDrag = (event: PointerDownEvent) => {
    event.stopPropagation()
    if (!root.current || !viewerTracked.current) return
    workspaceParentPoint(root.current, event.point, localPoint.current)
    workspaceParentPoint(root.current, eye.current, localEye.current)
    if (
      drag.current.move(
        event.pointerId,
        localPoint.current,
        localEye.current,
        target.current,
      )
    ) {
      root.current.position.copy(target.current)
    }
  }

  const finishDrag = (event: PointerDownEvent) => {
    event.stopPropagation()
    if (drag.current.pointerId === event.pointerId) endDrag()
  }

  return (
    <group
      ref={root}
      name={XR_WAND_PANEL_INPUT_NAME}
      visible={false}
      pointerEventsOrder={100}
      pointerEventsType={(pointerId, pointerType) =>
        pointerType !== 'grab' &&
        (drag.current.pointerId === null || drag.current.pointerId === pointerId)
      }
    >
      <group scale={WORKSPACE_CONTENT_SCALE * panelScale}>
        <group name="xr-workspace-content">
          <PanelFace width={1.4} height={1.04} />
          {tab === 'paint' && <XRWandPaintPanel adapter={adapter} />}
          {tab === 'build' && <XRWandBuildPanel adapter={adapter} />}
          {tab === 'settings' && <XRWandSettingsPanel adapter={adapter} />}
        </group>
        <group name="xr-workspace-tool-rail" position={[-0.8, 0, 0]}>
          <PanelFace width={0.16} height={1.04} />
          {TABS.map((value, index) => (
            <RailButton
              key={value}
              iconSrc={`/icons/${value}.webp`}
              name={`xr-workspace-tab-${value}`}
              y={RAIL_TOP - RAIL_ITEM_HEIGHT / 2 - index * (RAIL_ITEM_HEIGHT + RAIL_ITEM_GAP)}
              selected={tab === value}
              onClick={() => setTab(value)}
            />
          ))}
          <RailButton
            iconSrc="/icons/orbit.webp"
            name="xr-workspace-recenter"
            y={-0.43}
            onClick={() => useXRWorkspace.getState().recall()}
          />
        </group>
        <mesh
          ref={handle}
          name="xr-workspace-drag-handle"
          layers={overlay}
          position={[-0.09, DRAG_AREA_Y, 0]}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onClick={(event) => event.stopPropagation()}
        >
          <planeGeometry args={[0.52, 0.11]} />
          <meshBasicMaterial depthWrite={false} opacity={0} transparent />
          <mesh rotation={[0, 0, Math.PI / 2]} raycast={() => null}>
            <capsuleGeometry args={[0.022, 0.36, 6, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </mesh>
      </group>
    </group>
  )
}
