'use client'

import { useEffect, useMemo } from 'react'
import type { MeshBasicMaterialParameters } from 'three'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { useSpatialScroll } from './spatial-scroll'

export function SpatialMaterial(props: MeshBasicMaterialParameters) {
  const scroll = useSpatialScroll()
  const clipped = scroll !== null
  const material = useMemo(() => (clipped ? new MeshBasicNodeMaterial() : null), [clipped])
  useEffect(() => () => material?.dispose(), [material])
  if (!scroll || !material) return <meshBasicMaterial {...props} />
  // Clip in world space so both XR eyes use the same viewport boundaries.
  return <primitive object={material} attach="material" {...props} maskNode={scroll.maskNode} />
}
