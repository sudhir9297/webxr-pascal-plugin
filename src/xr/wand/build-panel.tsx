'use client'

import type { XRWandAdapter, XRWandBuildItem } from './adapter'
import { PanelIcon } from './panel-icon'
import { PanelHeader, SpatialButton } from './spatial-controls'
import { SpatialLine } from './spatial-line'
import { SpatialText } from './spatial-text'
import { XR_WAND_THEME } from './theme'

function tilePosition(index: number): [number, number, number] {
  return [-0.45 + (index % 4) * 0.3, 0.22 - Math.floor(index / 4) * 0.23, 0]
}

function PaletteTile({ item, index }: { item: XRWandBuildItem; index: number }) {
  return (
    <SpatialButton
      name={`xr-build-tool-${item.id}`}
      onClick={item.onSelect}
      position={tilePosition(index)}
      selected={item.active}
      size={[0.255, 0.2]}
    >
      <PanelIcon color={item.icon.color} size={0.092} src={item.icon.src} />
      <SpatialText
        anchorX="center"
        anchorY="middle"
        color={XR_WAND_THEME.text}
        fontSize={item.label.length > 12 ? 0.018 : 0.021}
        maxWidth={0.23}
        position={[0, -0.067, 0.012]}
        textAlign="center"
      >
        {item.label}
      </SpatialText>
    </SpatialButton>
  )
}

export function XRWandBuildPanel({ adapter }: { adapter: XRWandAdapter }) {
  const model = adapter.useBuildModel()

  const renderItems = (items: XRWandBuildItem[]) =>
    items.map((item, index) => <PaletteTile item={item} index={index} key={item.id} />)

  return (
    <group name="xr-wand-build-panel">
      <PanelHeader mark={model.mark} title={model.title} width={1.4} />
      {model.back ? (
        <SpatialButton
          name={`xr-build-${model.section}-back`}
          onClick={model.back.onSelect}
          position={[-0.55, 0.35, 0]}
          size={[0.12, 0.055]}
        >
          <SpatialText
            anchorX="center"
            anchorY="middle"
            color={XR_WAND_THEME.text}
            fontSize={0.019}
            position={[0, 0, 0.012]}
          >
            {model.back.label}
          </SpatialText>
        </SpatialButton>
      ) : null}
      <group position={[-0.36, 0, 0]} scale={[0.5, 1, 1]}>
        {renderItems(model.items)}
      </group>
      <group position={[0.36, 0, 0]} scale={[0.5, 1, 1]}>
        {renderItems(model.secondaryItems ?? [])}
      </group>
      <SpatialLine
        color={XR_WAND_THEME.border}
        lineWidth={1.2}
        opacity={0.75}
        points={[
          [0, -0.48, 0.016],
          [0, 0.48, 0.016],
        ]}
        transparent
      />
      {model.pageCount > 1 ? (
        <group position={[0.48, 0.35, 0]}>
          <SpatialButton
            disabled={model.page === 0}
            name={`xr-build-${model.section}-previous-page`}
            onClick={() => model.onPageChange?.(model.page - 1)}
            position={[-0.07, 0, 0]}
            size={[0.055, 0.055]}
          >
            <SpatialText color={XR_WAND_THEME.text} fontSize={0.026} position={[0, 0, 0.012]}>
              ‹
            </SpatialText>
          </SpatialButton>
          <SpatialText color={XR_WAND_THEME.text} fontSize={0.018} position={[0, 0, 0.012]}>
            {model.page + 1}/{model.pageCount}
          </SpatialText>
          <SpatialButton
            disabled={model.page >= model.pageCount - 1}
            name={`xr-build-${model.section}-next-page`}
            onClick={() => model.onPageChange?.(model.page + 1)}
            position={[0.07, 0, 0]}
            size={[0.055, 0.055]}
          >
            <SpatialText color={XR_WAND_THEME.text} fontSize={0.026} position={[0, 0, 0.012]}>
              ›
            </SpatialText>
          </SpatialButton>
        </group>
      ) : null}
    </group>
  )
}
