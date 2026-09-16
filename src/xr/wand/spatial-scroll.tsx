'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Group, Mesh, Plane, Vector3, Vector4, type Intersection, type Raycaster } from 'three'
import type { Node } from 'three/webgpu'
import { positionWorld, uniform } from 'three/tsl'
import { useWebXRSceneLayers } from '../layers'
import { clampScroll, ScrollDrag } from './scroll-drag'
import { XR_WAND_THEME } from './theme'

type PointerEvent3D = ThreeEvent<PointerEvent>
type ScrollInput = {
  begin: (event: PointerEvent3D, activate?: () => void, name?: string, scale?: number) => boolean
  planes: Plane[]
  maskNode: Node
  raycast: (this: Mesh, ray: Raycaster, hits: Intersection[]) => void
  wheel: (event: ThreeEvent<WheelEvent>) => void
}
const ScrollContext = createContext<ScrollInput | null>(null)
export const useSpatialScroll = () => useContext(ScrollContext)

export function SpatialScroll({
  children,
  name,
  width,
  height,
  contentHeight,
  position,
}: {
  children: ReactNode
  name: string
  width: number
  height: number
  contentHeight: number
  position: [number, number, number]
}) {
  const root = useRef<Group>(null)
  const capture = useRef<Mesh>(null)
  const { overlay } = useWebXRSceneLayers()
  const session = useXR((state) => state.session)
  const drag = useRef(new ScrollDrag())
  const activation = useRef<{ action?: () => void; name?: string }>({})
  const offsetRef = useRef(0)
  const [offset, setOffset] = useState(0)
  const limit = Math.max(0, contentHeight - height)
  const current = clampScroll(offset, contentHeight, height)
  const planes = useMemo(() => Array.from({ length: 4 }, () => new Plane()), [])
  const clipping = useMemo(() => {
    const values = Array.from({ length: 4 }, () => new Vector4())
    const conditions = values.map((value) => {
      const plane = uniform(value)
      return positionWorld.dot(plane.xyz).add(plane.w).greaterThanEqual(0)
    })
    const mask = conditions.reduce((result, condition) => result.and(condition))
    return { values, mask }
  }, [])
  const localPoint = useMemo(() => new Vector3(), [])

  const updateOffset = (next: number) => {
    offsetRef.current = clampScroll(next, contentHeight, height)
    setOffset(offsetRef.current)
    if (root.current) root.current.userData.scrollOffset = offsetRef.current
  }
  const localY = (event: PointerEvent3D) =>
    root.current!.worldToLocal(localPoint.copy(event.point)).y
  const cancel = () => {
    const pointerId = drag.current.pointerId
    if (pointerId !== null) capture.current?.releasePointerCapture?.(pointerId)
    drag.current.cancel()
    activation.current = {}
  }

  useEffect(() => {
    const visibility = () => {
      if (session?.visibilityState !== 'visible') cancel()
    }
    session?.addEventListener('end', cancel)
    session?.addEventListener('visibilitychange', visibility)
    session?.addEventListener('inputsourceschange', cancel)
    return () => {
      session?.removeEventListener('end', cancel)
      session?.removeEventListener('visibilitychange', visibility)
      session?.removeEventListener('inputsourceschange', cancel)
      cancel()
    }
  }, [session])

  useFrame(() => {
    if (!root.current) return
    root.current.updateWorldMatrix(true, false)
    planes[0]!.setComponents(1, 0, 0, width / 2)
    planes[1]!.setComponents(-1, 0, 0, width / 2)
    planes[2]!.setComponents(0, 1, 0, height / 2)
    planes[3]!.setComponents(0, -1, 0, height / 2)
    for (let index = 0; index < planes.length; index += 1) {
      const plane = planes[index]!.applyMatrix4(root.current.matrixWorld)
      clipping.values[index]!.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant)
    }
  }, -54)

  const input: ScrollInput = {
    planes,
    maskNode: clipping.mask,
    begin: (event, activate, targetName, scale = 1) => {
      event.stopPropagation()
      if (!root.current || !drag.current.begin(event.pointerId, localY(event), current, scale))
        return false
      activation.current = { action: activate, name: targetName }
      capture.current?.setPointerCapture?.(event.pointerId)
      return true
    },
    raycast(ray, hits) {
      const found: Intersection[] = []
      Mesh.prototype.raycast.call(this, ray, found)
      for (const hit of found) {
        if (planes.every((plane) => plane.distanceToPoint(hit.point) >= 0)) hits.push(hit)
      }
    },
    wheel: (event) => {
      event.stopPropagation()
      updateOffset(offsetRef.current + event.deltaY * (event.deltaMode === 1 ? 0.02 : 0.001))
    },
  }
  const move = (event: PointerEvent3D) => {
    event.stopPropagation()
    if (!root.current) return
    const next = drag.current.move(event.pointerId, localY(event), contentHeight, height)
    if (next !== undefined) updateOffset(next)
  }
  const release = (event: PointerEvent3D) => {
    event.stopPropagation()
    if (drag.current.pointerId !== event.pointerId) return
    move(event)
    const click = drag.current.end(event.pointerId)
    capture.current?.releasePointerCapture?.(event.pointerId)
    const pending = activation.current
    activation.current = {}
    if (click && Math.abs(localPoint.x) <= width / 2 && Math.abs(localPoint.y) <= height / 2) {
      if (pending.name && process.env.NODE_ENV === 'development')
        globalThis.__pascalXRLastPointerEvent = `click:${pending.name}`
      pending.action?.()
    }
  }
  const thumbHeight = Math.max(0.055, height * Math.min(1, height / contentHeight))
  const travel = height - thumbHeight

  return (
    <group ref={root} position={position} name={name}>
      <mesh
        ref={capture}
        layers={overlay}
        name={`${name}-surface`}
        position={[0, 0, 0.001]}
        onPointerDown={(event) => input.begin(event)}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={(event) => {
          if (drag.current.pointerId === event.pointerId) cancel()
        }}
        onClick={(event) => event.stopPropagation()}
        onWheel={input.wheel}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <ScrollContext.Provider value={input}>
        <group position={[0, current, 0]}>{children}</group>
      </ScrollContext.Provider>
      {limit > 0 && (
        <group position={[width / 2 + 0.025, 0, 0.018]}>
          <mesh
            layers={overlay}
            name={`${name}-track`}
            onPointerDown={(event) => {
              event.stopPropagation()
              if (!root.current || drag.current.pointerId !== null) return
              const next = ((height / 2 - thumbHeight / 2 - localY(event)) / travel) * limit
              updateOffset(next)
              // Begin from the jumped offset, not the previous React render.
              drag.current.begin(event.pointerId, localY(event), offsetRef.current, -limit / travel)
              activation.current = {}
              capture.current?.setPointerCapture?.(event.pointerId)
            }}
          >
            <planeGeometry args={[0.045, height]} />
            <meshBasicMaterial
              color={XR_WAND_THEME.border}
              transparent
              opacity={0.3}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh
            layers={overlay}
            name={`${name}-thumb`}
            position={[0, travel / 2 - (current / limit) * travel, 0.002]}
            onPointerDown={(event) => input.begin(event, undefined, undefined, -limit / travel)}
          >
            <planeGeometry args={[0.028, thumbHeight]} />
            <meshBasicMaterial color={XR_WAND_THEME.accentLine} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}
