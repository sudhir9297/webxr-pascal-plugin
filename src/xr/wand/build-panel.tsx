'use client'

import type { XRWandAdapter, XRWandBuildItem } from './adapter'
import { XRWandPaintPanel } from './paint-panel'
import { PanelIcon } from './panel-icon'
import { SettingRow } from './settings-panel'
import { PageArrows, PanelFace, PanelHeader, PanelHint, SpatialButton } from './spatial-controls'
import { SpatialScroll } from './spatial-scroll'
import { SpatialLine } from './spatial-line'
import { SpatialText } from './spatial-text'
import { XR_WAND_THEME } from './theme'

function PaletteTile({
  item,
  index,
  compact = false,
}: {
  item: XRWandBuildItem
  index: number
  compact?: boolean
}) {
  const columns = compact ? 3 : 4
  const gap = compact ? 0.33 : 0.31
  return (
    <SpatialButton
      name={`xr-build-tool-${item.id}`}
      onClick={item.onSelect}
      position={[
        ((index % columns) - (columns - 1) / 2) * gap,
        (compact ? 0.28 : 0.25) - Math.floor(index / columns) * (compact ? 0.19 : 0.235),
        0,
      ]}
      selected={item.active}
      size={compact ? [0.3, 0.165] : [0.285, 0.21]}
    >
      <PanelIcon
        color={item.icon.color}
        positionY={compact ? 0.023 : 0.025}
        size={compact ? 0.078 : 0.11}
        src={item.icon.src}
      />
      <SpatialText
        anchorX="center"
        anchorY="middle"
        color={XR_WAND_THEME.text}
        fontSize={compact ? 0.021 : 0.025}
        maxWidth={compact ? 0.27 : 0.26}
        position={[0, compact ? -0.052 : -0.067, 0.012]}
        textAlign="center"
      >
        {item.label}
      </SpatialText>
    </SpatialButton>
  )
}

export function XRWandBuildPanel({ adapter }: { adapter: XRWandAdapter }) {
  const model = adapter.useBuildModel()
  const hasChildren = !!model.secondaryItems?.length
  const details = adapter.useSettingsModel({ scope: 'context', unpaged: true })
  const hasDetails = details.contextual && (details.rows.length > 0 || !!details.onDelete)
  const detailHeight = hasChildren ? (hasDetails ? 1.52 : 0.78) : 1.04

  return (
    <group name="xr-wand-build-panel">
      <PanelHeader mark={model.mark} title="Build" width={1.4} />
      <group name="xr-build-primary">
        {model.items.map((item, index) => (
          <PaletteTile item={item} index={index} key={item.id} />
        ))}
      </group>
      {model.pageCount > 1 && (
        <PageArrows
          name="xr-build-main"
          onChange={(page) => model.onPageChange?.(page)}
          page={model.page}
          pageCount={model.pageCount}
        />
      )}
      {model.detailMode === 'paint' ? (
        <group name="xr-build-details" position={[1.44, 0, 0]}>
          <PanelFace width={1.4} height={1.04} />
          <XRWandPaintPanel adapter={adapter} />
        </group>
      ) : (
        (hasChildren || hasDetails) && (
          <group name="xr-build-details" position={[1.3, 0, 0]}>
            <group position={[0, 0.52 - detailHeight / 2, 0]}>
              <PanelFace width={1.12} height={detailHeight} />
            </group>
            <PanelHeader
              title={hasChildren ? (model.secondaryTitle ?? 'Options') : details.title}
              onDelete={hasChildren ? undefined : details.onDelete}
              width={1.12}
            />
            {hasChildren && (
              <>
                <SpatialScroll key={model.section} name="xr-build-options-scroll"
                  width={1.01} height={0.38} contentHeight={Math.ceil((model.secondaryItems?.length ?? 0) / 3) * 0.19}
                  position={[-0.014, 0.1875, 0]}>
                  <group position={[0, -0.1875, 0]}>
                    {model.secondaryItems?.map((item, index) => (
                      <PaletteTile item={item} index={index} key={item.id} compact />
                    ))}
                  </group>
                </SpatialScroll>
                <SpatialText color={XR_WAND_THEME.muted} fontSize={0.018}
                  position={[0, -0.055, 0.012]}>
                  {model.secondaryItems!.length > 6 ? 'Hold trigger or pinch, then drag to scroll' : `${model.secondaryItems!.length} options`}
                </SpatialText>
                <SpatialLine
                  color={XR_WAND_THEME.border}
                  opacity={0.6}
                  points={[
                    [-0.49, -0.105, 0.01],
                    [0.49, -0.105, 0.01],
                  ]}
                />
              </>
            )}
            {hasDetails ? (
              <>
                {hasChildren && (
                  <SpatialText
                    anchorX="left"
                    color={XR_WAND_THEME.muted}
                    fontSize={0.024}
                    maxWidth={0.85}
                    position={[-0.46, -0.145, 0.012]}
                  >
                    {details.title}
                  </SpatialText>
                )}
                <SpatialScroll key={details.title} name="xr-build-properties-scroll" width={0.96}
                  height={0.6} contentHeight={details.rows.length * 0.12}
                  position={[0, hasChildren ? -0.49 : 0, 0]}>
                  {details.rows.map((row, index) => (
                    <group key={row.id} position={[0, 0.24 - index * 0.12, 0]}>
                      <SettingRow row={row} />
                    </group>
                  ))}
                </SpatialScroll>
                {details.rows.length > 5 && <SpatialText color={XR_WAND_THEME.muted} fontSize={0.018}
                  position={[0, hasChildren ? -0.86 : -0.36, 0.012]}>Drag to see more controls</SpatialText>}
                {details.pageCount > 1 && (
                  <group position={[0, hasChildren ? -0.48 : 0, 0]}>
                    <PageArrows
                      name="xr-settings"
                      onChange={(page) => details.onPageChange?.(page)}
                      page={details.page}
                      pageCount={details.pageCount}
                    />
                  </group>
                )}
              </>
            ) : (
              <PanelHint position={[0, -0.18, 0.012]}>
                Choose an item, then point at the scene to place it
              </PanelHint>
            )}
            {hasChildren && model.back && (
              <SpatialButton
                name={`xr-build-${model.section}-back`}
                onClick={model.back.onSelect}
                position={[0.44, 0.45, 0]}
                size={[0.075, 0.065]}
              >
                <SpatialText color={XR_WAND_THEME.muted} fontSize={0.03} position={[0, 0, 0.012]}>
                  ×
                </SpatialText>
              </SpatialButton>
            )}
          </group>
        )
      )}
    </group>
  )
}
