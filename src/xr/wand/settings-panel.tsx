'use client'

import { useSyncExternalStore } from 'react'
import type { XRWandAction, XRWandAdapter, XRWandSettingRow } from './adapter'
import {
  PageArrows,
  PanelHeader,
  PanelHint,
  SettingChoice,
  SettingCycle,
  SettingStepper,
  SpatialButton,
} from './spatial-controls'
import { SpatialText } from './spatial-text'
import { XR_WAND_THEME } from './theme'

function ActionButton({ action }: { action: XRWandAction }) {
  return (
    <SpatialButton
      disabled={action.disabled || !action.onSelect}
      name={`xr-setting-${action.id}`}
      onClick={action.onSelect}
      position={[0, 0, 0]}
      size={[0.7, 0.075]}
    >
      <SpatialText color={XR_WAND_THEME.text} fontSize={0.021} position={[0, 0, 0.012]}>
        {action.label}
      </SpatialText>
    </SpatialButton>
  )
}

function SubscribedChoice({
  row,
}: {
  row: Extract<XRWandSettingRow, { kind: 'subscribed-choice' }>
}) {
  const value = useSyncExternalStore(row.subscribe, row.getValue, row.getValue)
  return (
    <SettingChoice
      label={row.label}
      name={`xr-setting-${row.id}`}
      onClick={row.onSelect}
      value={value}
    />
  )
}

function SettingRow({ row }: { row: XRWandSettingRow }) {
  if (row.kind === 'stepper') {
    return (
      <SettingStepper
        label={row.label}
        max={row.max}
        min={row.min}
        name={`xr-setting-${row.id}`}
        onChange={row.onChange}
        step={row.step}
        unit={row.unit}
        value={row.value}
      />
    )
  }
  if (row.kind === 'cycle') {
    return (
      <SettingCycle
        label={row.label}
        name={`xr-setting-${row.id}`}
        next={row.next}
        previous={row.previous}
        value={row.value}
      />
    )
  }
  if (row.kind === 'choice') {
    return (
      <SettingChoice
        label={row.label}
        name={`xr-setting-${row.id}`}
        onClick={row.onSelect}
        value={row.value}
      />
    )
  }
  if (row.kind === 'subscribed-choice') return <SubscribedChoice row={row} />
  if (row.kind === 'actions') {
    const width = Math.min(0.7 / Math.max(1, row.actions.length), 0.32)
    return (
      <group>
        {row.actions.map((action, index) => (
          <group
            key={action.id}
            position={[(index - (row.actions.length - 1) / 2) * (width + 0.04), 0, 0]}
            scale={[width / 0.7, 1, 1]}
          >
            <ActionButton action={action} />
          </group>
        ))}
      </group>
    )
  }
  return <ActionButton action={row} />
}

export function XRWandSettingsPanel({ adapter }: { adapter: XRWandAdapter }) {
  const model = adapter.useSettingsModel()

  return (
    <group name="xr-wand-settings-panel">
      <PanelHeader mark={model.mark} onDelete={model.onDelete} title={model.title} />
      {model.headerActions?.length ? (
        <group position={[0, 0.3, 0]}>
          {model.headerActions.map((action, index) => (
            <group
              key={action.id}
              position={[(index - (model.headerActions!.length - 1) / 2) * 0.24, 0, 0]}
              scale={[0.3, 1, 1]}
            >
              <ActionButton action={action} />
            </group>
          ))}
        </group>
      ) : null}
      {model.rows.map((row, index) => (
        <group key={row.id} position={[0, 0.18 - index * 0.12, 0]}>
          <SettingRow row={row} />
        </group>
      ))}
      {!model.rows.length && model.emptyMessage ? (
        <PanelHint>{model.emptyMessage}</PanelHint>
      ) : null}
      {model.pageCount > 1 ? (
        <PageArrows
          name="xr-settings"
          onChange={(page) => model.onPageChange?.(page)}
          page={model.page}
          pageCount={model.pageCount}
        />
      ) : null}
    </group>
  )
}
