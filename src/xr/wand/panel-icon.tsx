'use client'

import { useWebXRSceneLayers } from '../layers'
import { useTexture } from '@react-three/drei'
import { Component, type ReactNode, Suspense } from 'react'
import { SRGBColorSpace } from 'three'
import { XR_WAND_THEME } from './theme'

function TextureIcon({ positionY, size, src }: { positionY: number; size: number; src: string }) {
  const { overlay } = useWebXRSceneLayers()
  const texture = useTexture(src)
  texture.colorSpace = SRGBColorSpace
  return (
    <mesh layers={overlay} position={[0, positionY, 0.012]} renderOrder={6} raycast={() => undefined}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial alphaTest={0.05} map={texture} toneMapped={false} transparent />
    </mesh>
  )
}

function ColorIcon({ color, positionY, size }: { color: string; positionY: number; size: number }) {
  const { overlay } = useWebXRSceneLayers()
  return (
    <mesh layers={overlay} position={[0, positionY, 0.012]} renderOrder={6} raycast={() => undefined}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

type TextureIconBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
}

type TextureIconBoundaryState = {
  hasError: boolean
}

class TextureIconBoundary extends Component<TextureIconBoundaryProps, TextureIconBoundaryState> {
  state: TextureIconBoundaryState = { hasError: false }

  static getDerivedStateFromError(): TextureIconBoundaryState {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

export function PanelIcon({
  color = XR_WAND_THEME.border,
  positionY = 0.022,
  size = 0.09,
  src,
}: {
  color?: string
  positionY?: number
  size?: number
  src?: string
}) {
  if (!src) {
    return <ColorIcon color={color} positionY={positionY} size={size} />
  }

  const fallback = <ColorIcon color={color} positionY={positionY} size={size} />
  return (
    <TextureIconBoundary fallback={fallback} key={src}>
      <Suspense fallback={fallback}>
        <TextureIcon positionY={positionY} size={size} src={src} />
      </Suspense>
    </TextureIconBoundary>
  )
}
