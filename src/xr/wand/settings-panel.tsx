'use client'

import { useState, useSyncExternalStore } from 'react'
import { SpatialScroll } from './spatial-scroll'
import { SpatialLine } from './spatial-line'
import type { XRWandAction, XRWandAdapter, XRWandSettingRow, XRWandSettingsModel } from './adapter'
import {
  PanelHeader,
  PanelHint,
  SettingChoice,
  SettingCycle,
  SettingStepper,
  SpatialButton,
} from './spatial-controls'
import { SpatialText } from './spatial-text'
import { XR_WAND_THEME } from './theme'
import { useXRWorkspace } from './workspace-store'

function ActionButton({ action, width = 0.7 }: { action: XRWandAction; width?: number }) {
  return (
    <SpatialButton
      disabled={action.disabled || !action.onSelect}
      name={`xr-setting-${action.id}`}
      onClick={action.onSelect}
      position={[0, 0, 0]}
      size={[width, 0.075]}
    >
      <SpatialText
        color={XR_WAND_THEME.text}
        fontSize={width < 0.4 ? 0.021 : 0.026}
        maxWidth={width - 0.04}
        position={[0, 0, 0.012]}
      >
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

export function SettingRow({ row }: { row: XRWandSettingRow }) {
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
          >
            <ActionButton action={action} width={width} />
          </group>
        ))}
      </group>
    )
  }
  return <ActionButton action={row} />
}

function WideSettingRow({ row }: { row: XRWandSettingRow }) {
  if (row.kind === 'action') return <ActionButton action={row} width={1.12} />
  if (row.kind === 'actions') return <SettingRow row={row} />
  if (row.kind === 'subscribed-choice') return <WideSubscribedChoice row={row} />
  const label = row.label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (value) => value.toUpperCase())
  const button = (
    name: string,
    text: string,
    x: number,
    width: number,
    onClick?: () => void,
    disabled = false,
  ) => (
    <SpatialButton
      name={name}
      position={[x, 0, 0]}
      size={[width, 0.082]}
      onClick={onClick}
      disabled={disabled || !onClick}
    >
      <SpatialText
        color={disabled || !onClick ? XR_WAND_THEME.muted : XR_WAND_THEME.text}
        fontSize={text.length > 20 ? 0.021 : 0.026}
        maxWidth={width - 0.025}
        position={[0, 0, 0.014]}
      >
        {text}
      </SpatialText>
    </SpatialButton>
  )
  return (
    <group>
      <SpatialText
        anchorX="left"
        color={XR_WAND_THEME.text}
        fontSize={0.026}
        maxWidth={0.52}
        textAlign="left"
        position={[-0.55, 0, 0.014]}
      >
        {label}
      </SpatialText>
      {row.kind === 'choice' ? (
        button(`xr-setting-${row.id}`, row.value, 0.32, 0.46, row.onSelect)
      ) : (
        <>
          {button(
            `xr-setting-${row.id}-${row.kind === 'stepper' ? 'decrement' : 'previous'}`,
            row.kind === 'stepper' ? '−' : '‹',
            0.09,
            0.085,
            row.kind === 'stepper'
              ? () => row.onChange(Math.max(row.min, row.value - row.step))
              : row.previous,
            row.kind === 'stepper' && row.value <= row.min,
          )}
          <SpatialText
            color={XR_WAND_THEME.text}
            fontSize={0.025}
            maxWidth={0.28}
            position={[0.32, 0, 0.014]}
          >
            {row.kind === 'stepper'
              ? `${Number(row.value.toFixed(3))}${row.unit ? ` ${row.unit}` : ''}`
              : row.value}
          </SpatialText>
          {button(
            `xr-setting-${row.id}-${row.kind === 'stepper' ? 'increment' : 'next'}`,
            row.kind === 'stepper' ? '+' : '›',
            0.55,
            0.085,
            row.kind === 'stepper'
              ? () => row.onChange(Math.min(row.max, row.value + row.step))
              : row.next,
            row.kind === 'stepper' && row.value >= row.max,
          )}
        </>
      )}
      <SpatialLine
        color={XR_WAND_THEME.border}
        opacity={0.22}
        points={[
          [-0.56, -0.06, 0.01],
          [0.59, -0.06, 0.01],
        ]}
      />
    </group>
  )
}

function WideSubscribedChoice({
  row,
}: {
  row: Extract<XRWandSettingRow, { kind: 'subscribed-choice' }>
}) {
  const value = useSyncExternalStore(row.subscribe, row.getValue, row.getValue)
  return <WideSettingRow row={{ ...row, kind: 'choice', value }} />
}

function SettingsInspector({ model }: { model: XRWandSettingsModel }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const sections = new Map<string, XRWandSettingRow[]>()
  for (const row of model.rows) {
    const name = row.section ?? 'Properties'
    const rows = sections.get(name) ?? []
    rows.push(row)
    sections.set(name, rows)
  }
  let cursor = 0
  const content = [...sections].map(([name, rows]) => {
    const top = cursor
    const closed = collapsed.has(name)
    cursor += 0.09 + (closed ? 0 : rows.length * 0.13) + 0.025
    return (
      <group key={name} position={[0, -top, 0]}>
        <SpatialButton
          name={`xr-settings-section-${name}`}
          position={[0, -0.045, 0]}
          size={[1.18, 0.072]}
          onClick={() =>
            setCollapsed((current) => {
              const next = new Set(current)
              if (next.has(name)) next.delete(name)
              else next.add(name)
              return next
            })
          }
        >
          <SpatialText
            anchorX="left"
            color={XR_WAND_THEME.accentLine}
            fontSize={0.025}
            maxWidth={0.97}
            position={[-0.55, 0, 0.014]}
          >
            {name}
          </SpatialText>
          <SpatialText color={XR_WAND_THEME.muted} fontSize={0.024} position={[0.51, 0, 0.014]}>
            {closed ? '+' : '−'}
          </SpatialText>
        </SpatialButton>
        {!closed &&
          rows.map((row, index) => (
            <group key={row.id} position={[0, -0.155 - index * 0.13, 0]}>
              <WideSettingRow row={row} />
            </group>
          ))}
      </group>
    )
  })
  const actions = model.onClearSelection
    ? [
        {
          id: 'clear-selection',
          label: 'Deselect · Workspace settings',
          onSelect: model.onClearSelection,
        },
      ]
    : (model.headerActions ?? [])
  return (
    <group name="xr-wand-settings-panel">
      <PanelHeader mark={model.onDelete ? undefined : model.mark} onDelete={model.onDelete} title={model.title} width={1.4} />
      <group position={[0, 0.34, 0]}>
        {actions.map((action, index) => (
          <group key={action.id} position={[(index - (actions.length - 1) / 2) * 0.41, 0, 0]}>
            <ActionButton action={action} width={actions.length === 1 ? 1.18 : 0.38} />
          </group>
        ))}
      </group>
      <SpatialScroll
        name="xr-settings-properties-scroll"
        width={1.25}
        height={0.67}
        contentHeight={cursor}
        position={[-0.014, -0.075, 0]}
      >
        <group position={[0, 0.335, 0]}>{content}</group>
      </SpatialScroll>
      {!model.rows.length && (
        <PanelHint position={[0, 0, 0.014]}>
          {model.emptyMessage ?? 'No properties available'}
        </PanelHint>
      )}
      <SpatialText
        color={XR_WAND_THEME.muted}
        fontSize={0.021}
        maxWidth={1.2}
        position={[0, -0.468, 0.014]}
      >
        {cursor > 0.67
          ? 'Hold trigger or pinch and drag · Tap a section to collapse'
          : 'Tap a control to change its value'}
      </SpatialText>
    </group>
  )
}

export function XRWandSettingsPanel({ adapter, panelPlacement = false }: {
  adapter: XRWandAdapter
  panelPlacement?: boolean
}) {
  const model = adapter.useSettingsModel({ scope: 'selection', unpaged: true })
  const settings = panelPlacement ? {
    ...model,
    rows: [
      ...model.rows,
      {
        kind: 'action' as const,
        id: 'bring-workspace-here',
        section: 'Panel placement',
        label: 'Bring workspace here · Keep panel offset',
        onSelect: () => useXRWorkspace.getState().recall(),
      },
      {
        kind: 'action' as const,
        id: 'reset-panel-offset',
        section: 'Panel placement',
        label: 'Reset panel offset · Keep workspace position',
        onSelect: () => useXRWorkspace.getState().resetPanelPosition(),
      },
    ],
  } : model
  return <SettingsInspector key={model.contextKey ?? model.title} model={settings} />
}
