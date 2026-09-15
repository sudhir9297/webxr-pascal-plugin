'use client'

import type { XRWandAdapter, XRWandPaintItem } from './adapter'
import { PanelIcon } from './panel-icon'
import { PanelHeader, SpatialButton } from './spatial-controls'
import { SpatialLine } from './spatial-line'
import { SpatialText } from './spatial-text'
import { XR_WAND_THEME } from './theme'

const MATERIAL_TILE_SIZE: [number, number] = [0.255, 0.205]
const MATERIAL_PREVIEW_SIZE = 0.116
const MATERIAL_GRID_TOP = 0.135
const MATERIAL_GRID_ROW_GAP = 0.25
const MATERIAL_PREVIEW_FRAME = MATERIAL_PREVIEW_SIZE / 2
const MATERIAL_PREVIEW_FRAME_POINTS: [number, number, number][] = [
  [-MATERIAL_PREVIEW_FRAME, -MATERIAL_PREVIEW_FRAME + 0.022, 0.014],
  [MATERIAL_PREVIEW_FRAME, -MATERIAL_PREVIEW_FRAME + 0.022, 0.014],
  [MATERIAL_PREVIEW_FRAME, MATERIAL_PREVIEW_FRAME + 0.022, 0.014],
  [-MATERIAL_PREVIEW_FRAME, MATERIAL_PREVIEW_FRAME + 0.022, 0.014],
  [-MATERIAL_PREVIEW_FRAME, -MATERIAL_PREVIEW_FRAME + 0.022, 0.014],
]

function materialPosition(index: number): [number, number, number] {
  return [
    -0.45 + (index % 4) * 0.3,
    MATERIAL_GRID_TOP - Math.floor(index / 4) * MATERIAL_GRID_ROW_GAP,
    0,
  ]
}

function materialLabelFontSize(label: string) {
  if (label.length > 16) return 0.016
  if (label.length > 11) return 0.017
  return 0.018
}

function MaterialTile({ item, index }: { item: XRWandPaintItem; index: number }) {
  return (
    <SpatialButton
      name={`xr-paint-material-${item.id}`}
      onClick={item.onSelect}
      position={materialPosition(index)}
      selected={item.selected}
      size={MATERIAL_TILE_SIZE}
    >
      <PanelIcon color={item.icon.color} size={MATERIAL_PREVIEW_SIZE} src={item.icon.src} />
      <SpatialLine
        color={item.selected ? XR_WAND_THEME.accentLine : XR_WAND_THEME.border}
        lineWidth={item.selected ? 1.5 : 0.8}
        opacity={item.selected ? 0.95 : 0.8}
        points={MATERIAL_PREVIEW_FRAME_POINTS}
        transparent
      />
      <SpatialText
        color={XR_WAND_THEME.text}
        fontSize={materialLabelFontSize(item.label)}
        maxWidth={0.23}
        position={[0, -0.07, 0.012]}
      >
        {item.label}
      </SpatialText>
    </SpatialButton>
  )
}

export function XRWandPaintPanel({ adapter }: { adapter: XRWandAdapter }) {
  const model = adapter.usePaintModel()

  return (
    <group name="xr-wand-paint-panel">
      <PanelHeader mark={model.mark} title="Paint" width={1.4} />
      <group position={[0, 0.345, 0]}>
        <SpatialButton
          disabled={!model.category.canChange}
          name="xr-paint-previous-category"
          onClick={model.category.previous}
          position={[-0.55, 0, 0]}
          size={[0.075, 0.06]}
        >
          <SpatialText color={XR_WAND_THEME.text} fontSize={0.027} position={[0, 0, 0.012]}>
            ‹
          </SpatialText>
        </SpatialButton>
        <SpatialText color={XR_WAND_THEME.text} fontSize={0.023} position={[0, 0, 0.012]}>
          {model.category.label} · {model.category.position}/{model.category.total}
        </SpatialText>
        <SpatialButton
          disabled={!model.category.canChange}
          name="xr-paint-next-category"
          onClick={model.category.next}
          position={[0.55, 0, 0]}
          size={[0.075, 0.06]}
        >
          <SpatialText color={XR_WAND_THEME.text} fontSize={0.027} position={[0, 0, 0.012]}>
            ›
          </SpatialText>
        </SpatialButton>
      </group>
      <group position={[0, 0.275, 0]}>
        <SpatialButton
          name="xr-paint-start"
          onClick={model.startPainting}
          position={[-0.245, 0, 0]}
          selected={model.brushActive}
          size={[0.44, 0.06]}
        >
          <SpatialText color={XR_WAND_THEME.text} fontSize={0.019} position={[0, 0, 0.012]}>
            {model.brushActive ? 'Brush armed' : 'Start painting'}
          </SpatialText>
        </SpatialButton>
        <SpatialButton
          name="xr-paint-eraser"
          onClick={model.toggleEraser}
          position={[0.245, 0, 0]}
          selected={model.eraserActive}
          size={[0.44, 0.06]}
        >
          <SpatialText color={XR_WAND_THEME.text} fontSize={0.019} position={[0, 0, 0.012]}>
            Eraser
          </SpatialText>
        </SpatialButton>
      </group>
      {model.items.length ? (
        model.items.map((item, index) => <MaterialTile item={item} index={index} key={item.id} />)
      ) : (
        <SpatialText
          color={XR_WAND_THEME.muted}
          fontSize={0.02}
          maxWidth={0.45}
          position={[0, -0.03, 0.012]}
        >
          No materials in this category
        </SpatialText>
      )}
      <SpatialButton
        disabled={model.scope.disabled}
        name="xr-paint-scope"
        onClick={model.scope.onSelect}
        position={[0, -0.265, 0]}
        selected={model.scope.selected}
        size={[0.7, 0.055]}
      >
        <SpatialText
          color={model.scope.disabled ? XR_WAND_THEME.muted : XR_WAND_THEME.text}
          fontSize={0.018}
          maxWidth={0.43}
          position={[0, 0, 0.012]}
        >
          {model.scope.label}
        </SpatialText>
      </SpatialButton>
      <group position={[0, -0.35, 0]}>
        {model.pageCount > 1 ? (
          <>
            <SpatialButton
              disabled={model.page === 0}
              name="xr-paint-previous-page"
              onClick={() => model.onPageChange?.(model.page - 1)}
              position={[-0.28, 0, 0]}
              size={[0.075, 0.055]}
            >
              <SpatialText color={XR_WAND_THEME.text} fontSize={0.027} position={[0, 0, 0.012]}>
                ‹
              </SpatialText>
            </SpatialButton>
            <SpatialButton
              disabled={model.page >= model.pageCount - 1}
              name="xr-paint-next-page"
              onClick={() => model.onPageChange?.(model.page + 1)}
              position={[0.28, 0, 0]}
              size={[0.075, 0.055]}
            >
              <SpatialText color={XR_WAND_THEME.text} fontSize={0.027} position={[0, 0, 0.012]}>
                ›
              </SpatialText>
            </SpatialButton>
          </>
        ) : null}
        <SpatialText color={XR_WAND_THEME.muted} fontSize={0.018} position={[0, 0, 0.012]}>
          {model.activeMaterialLabel}
          {model.pageCount > 1 ? ` · ${model.page + 1}/${model.pageCount}` : ''}
        </SpatialText>
      </group>
    </group>
  )
}
