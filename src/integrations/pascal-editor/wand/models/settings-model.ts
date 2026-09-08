'use client'

import {
  type AnyNode,
  type AnyNodeId,
  type BuildingNode,
  DEFAULT_LEVEL_HEIGHT,
  getLevelDisplayName,
  getLibraryMaterialIdFromRef,
  getLibraryMaterialsVersion,
  getMaterialsForCategory,
  LevelNode,
  MATERIAL_CATEGORIES,
  type ParamAction,
  type RoofNode,
  RoofType as RoofTypeSchema,
  subscribeLibraryMaterials,
  toLibraryMaterialRef,
  useRegistryVersion,
  useScene,
} from '@pascal-app/core'
import {
  commitParametricNodeFields,
  cycleSnappingModeIn,
  emitDeleteSFX,
  getHistoryCommandState,
  getSnappingModeLabel,
  runRedo,
  runUndo,
  subscribeHistoryCommandState,
  triggerSFX,
  useEditor,
  useInteractionScope,
} from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { requestGodScaleReset } from '../../../../xr/god-mode'
import { toggleXRPlayerMode, useXRPlayerMode, XR_PLAYER_MODES } from '../../../../xr/mode-switching'
import {
  getPage,
  useXRWandPanelSettings,
  XR_WAND_PANEL_SCALE_MAX,
  XR_WAND_PANEL_SCALE_MIN,
  XR_WAND_PANEL_SCALE_STEP,
  type XRWandSettingRow,
  type XRWandSettingsModel,
} from '../../../../xr/wand'
import { useMemo, useSyncExternalStore } from 'react'
import {
  collectXRSettingRows,
  createXRSettingPatch,
  readXRSettingValue,
  resolveXRSettingsContext,
  type XRSettingFieldRow,
  type XRSettingRow,
  type XRSettingsContext,
} from './settings-descriptors'
import type { PascalXRWandBindings } from '../bindings'
import { usePascalXRWandTerrainModel } from './terrain-model'

const ROWS_PER_PAGE = 5
const DEFAULT_SETTINGS_CONTEXT_KEY = 'default-settings'
const DEFAULT_SETTINGS_PAGES = 2
const XR_COLORS = ['#888888', '#ffffff', '#18181b', '#ef4444', '#22c55e', '#3b82f6']

function cycleOption(options: readonly unknown[], current: unknown, direction: -1 | 1) {
  if (options.length === 0) return undefined
  const index = options.indexOf(current)
  const base = index < 0 ? (direction === 1 ? -1 : 0) : index
  return options[(base + direction + options.length) % options.length]
}

function formatValue(value: unknown) {
  if (typeof value === 'string') return value || 'None'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  if (typeof value === 'number') return String(Number(value.toFixed(3)))
  return value == null ? 'None' : 'Assigned'
}

function collectRoofActionRows(node: AnyNode, bindings: PascalXRWandBindings): XRSettingRow[] {
  if (node.type !== 'roof' && node.type !== 'roof-segment') return []
  const roofType = node.type === 'roof-segment' ? node.roofType : 'gable'
  const rows: XRSettingRow[] = bindings.getRoofFootprintSources(roofType).map((source) => ({
    action: {
      label: source.value === 'draw' ? 'Draw Footprint' : `Create from ${source.label}`,
      onClick: () => bindings.activateRoofFootprintSource(source.value),
    } satisfies ParamAction<AnyNode>,
    id: `roof-source-${source.value}`,
    kind: 'action',
    label: source.value === 'draw' ? 'Draw Footprint' : `Create from ${source.label}`,
  }))

  rows.push({
    action: {
      label: 'Draw Segment',
      onClick: () => {
        triggerSFX('sfx:item-pick')
        const editor = useEditor.getState()
        editor.setTool('roof')
        if (editor.mode !== 'build') editor.setMode('build')
      },
    } satisfies ParamAction<AnyNode>,
    id: 'roof-draw-segment',
    kind: 'action',
    label: 'Draw Segment',
  })

  for (const feature of bindings.collectRoofFeatures()) {
    rows.push({
      action: {
        label: `Add ${feature.label}`,
        onClick: () => bindings.activateRoofFeatureTool(feature),
      } satisfies ParamAction<AnyNode>,
      id: `roof-feature-${feature.id}`,
      kind: 'action',
      label: `Add ${feature.label}`,
    })
  }
  return rows
}

function fieldModel({
  context,
  materials,
  onChange,
  referenceNodes,
  row,
}: {
  context: XRSettingsContext
  materials: ReturnType<typeof getMaterialsForCategory>
  onChange: (row: XRSettingFieldRow, value: unknown) => void
  referenceNodes: AnyNode[]
  row: XRSettingFieldRow
}): XRWandSettingRow {
  let value = readXRSettingValue(context, row)
  const id = `${String(row.field.key)}${row.axis == null ? '' : `-${row.axis}`}`

  if (row.field.kind === 'number' || row.field.kind === 'vec3') {
    const min = row.field.kind === 'number' ? (row.field.min ?? -1000) : -1000
    const max = row.field.kind === 'number' ? (row.field.max ?? 1000) : 1000
    return {
      id,
      kind: 'stepper',
      label: row.label,
      max,
      min,
      onChange: (next) => onChange(row, next),
      step: row.field.kind === 'number' ? (row.field.step ?? 0.1) : 0.1,
      unit: row.field.kind === 'number' ? row.field.unit : undefined,
      value: Math.max(min, Math.min(max, typeof value === 'number' ? value : min)),
    }
  }
  if (row.field.kind === 'boolean') {
    return {
      id,
      kind: 'choice',
      label: row.label,
      onSelect: () => onChange(row, value !== true),
      value: value === true ? 'On' : 'Off',
    }
  }
  if (row.field.kind === 'custom') {
    return { id, kind: 'choice', label: row.label, value: 'Custom editor' }
  }

  let options: readonly unknown[] = []
  let displayValue = formatValue(value)
  let mapValue = (next: unknown) => next
  if (row.field.kind === 'enum') options = row.field.options
  if (row.field.kind === 'color') options = XR_COLORS
  if (row.field.kind === 'material') {
    options = materials.map((material) => material.id)
    const selectedId = getLibraryMaterialIdFromRef(value as never)
    displayValue = materials.find((material) => material.id === selectedId)?.label ?? 'Default'
    mapValue = (next) => toLibraryMaterialRef(String(next))
    value = selectedId
  }
  if (row.field.kind === 'ref') {
    const refKind = row.field.refKind
    const references = referenceNodes.filter((node) => node.type === refKind)
    options = [null, ...references.map((node) => node.id)]
    const selected = references.find((node) => node.id === value)
    displayValue = selected ? String(selected.name || selected.type) : 'None'
  }
  const change = (direction: -1 | 1) => {
    const next = cycleOption(options, value, direction)
    if (next !== undefined) onChange(row, mapValue(next))
  }
  return {
    id,
    kind: 'cycle',
    label: row.label,
    next: () => change(1),
    previous: () => change(-1),
    value: displayValue,
  }
}

function registryRowModel(
  row: XRSettingRow,
  context: XRSettingsContext,
  materials: ReturnType<typeof getMaterialsForCategory>,
  referenceNodes: AnyNode[],
  update: (row: XRSettingFieldRow, value: unknown) => void,
): XRWandSettingRow {
  if (row.kind === 'field') {
    return fieldModel({
      context,
      materials,
      onChange: update,
      referenceNodes,
      row,
    })
  }
  if (row.kind === 'action') {
    return {
      disabled: row.action.enabledIf ? !row.action.enabledIf(context.node) : false,
      id: `action-${row.id}`,
      kind: 'action',
      label: row.label,
      onSelect: () =>
        row.action.onClick(useScene.getState().nodes[context.node.id as AnyNodeId] as AnyNode),
    }
  }
  const { chip } = row.hint
  return {
    getValue: () => {
      const value = chip.value()
      return chip.labels[value] ?? value
    },
    id: row.id,
    kind: 'subscribed-choice',
    label: row.label,
    onSelect: chip.cycle,
    subscribe: chip.subscribe,
  }
}

export function usePascalXRWandSettingsModel(bindings: PascalXRWandBindings): XRWandSettingsModel {
  const terrainModel = usePascalXRWandTerrainModel()
  const paginationKey = useXRWandPanelSettings((state) => state.settingsContextKey)
  const paginationPage = useXRWandPanelSettings((state) => state.settingsPage)
  const setSettingsNavigation = useXRWandPanelSettings((state) => state.setSettingsNavigation)
  const panelScale = useXRWandPanelSettings((state) => state.panelScale)
  const setPanelScale = useXRWandPanelSettings((state) => state.setPanelScale)
  const mode = useEditor((state) => state.mode)
  const tool = useEditor((state) => state.tool)
  const toolDefaults = useEditor((state) =>
    state.tool ? state.toolDefaults[state.tool] : undefined,
  )
  const setToolDefaults = useEditor((state) => state.setToolDefaults)
  const gridSnapStep = useEditor((state) => state.gridSnapStep)
  const cycleGridSnapStep = useEditor((state) => state.cycleGridSnapStep)
  const wallSnappingMode = useEditor((state) => state.snappingModeByContext.wall)
  const setSnappingMode = useEditor((state) => state.setSnappingMode)
  const interactionIdle = useInteractionScope((state) => state.scope.kind === 'idle')
  const playerMode = useXRPlayerMode((state) => state.mode)
  const selection = useViewer((state) => state.selection)
  const setSelection = useViewer((state) => state.setSelection)
  const nodes = useScene((state) => state.nodes)
  const createNode = useScene((state) => state.createNode)
  const deleteNode = useScene((state) => state.deleteNode)
  const selectedId = selection.selectedIds.length === 1 ? selection.selectedIds[0] : undefined
  const selectedNode = selectedId ? nodes[selectedId as AnyNodeId] : undefined
  const materialVersion = useSyncExternalStore(
    subscribeLibraryMaterials,
    getLibraryMaterialsVersion,
    getLibraryMaterialsVersion,
  )
  const canUndo = useSyncExternalStore(
    subscribeHistoryCommandState,
    () => getHistoryCommandState().canUndo,
    () => false,
  )
  const canRedo = useSyncExternalStore(
    subscribeHistoryCommandState,
    () => getHistoryCommandState().canRedo,
    () => false,
  )
  const registryVersion = useRegistryVersion()
  const materials = useMemo(() => {
    void materialVersion
    return MATERIAL_CATEGORIES.flatMap((category) => getMaterialsForCategory(category))
  }, [materialVersion])
  const referenceNodes = useMemo(() => Object.values(nodes).filter(Boolean) as AnyNode[], [nodes])
  const context = useMemo(
    () => resolveXRSettingsContext({ mode, selectedNode, tool, toolDefaults }),
    [mode, selectedNode, tool, toolDefaults],
  )

  const resolvedBuildingId =
    selection.buildingId && nodes[selection.buildingId]?.type === 'building'
      ? selection.buildingId
      : (Object.values(nodes).find((node) => node?.type === 'building') as BuildingNode | undefined)
          ?.id
  const levels = useMemo(() => {
    const building = resolvedBuildingId ? nodes[resolvedBuildingId] : undefined
    if (building?.type !== 'building') return [] as LevelNode[]
    return building.children
      .map((id) => nodes[id])
      .filter((node): node is LevelNode => node?.type === 'level')
      .sort((a, b) => a.level - b.level)
  }, [nodes, resolvedBuildingId])
  const activeLevel = levels.find((level) => level.id === selection.levelId) ?? levels[0]

  if (mode === 'terrain-sculpt') return terrainModel

  const deleteSelectedNode = () => {
    if (!(selectedId && selectedNode && context?.source === 'node')) return
    if (context.definition.capabilities.deletable === false) return
    emitDeleteSFX(selectedNode.type)
    setSelection({ selectedIds: [] })
    deleteNode(selectedId as AnyNodeId)
  }
  const update = (row: XRSettingFieldRow, value: unknown) => {
    if (!context) return
    const patch = createXRSettingPatch(context, row, value)
    if (context.source === 'node') {
      commitParametricNodeFields(context.node.id as AnyNodeId, patch)
    } else if (context.tool) {
      setToolDefaults(context.tool, { ...toolDefaults, ...patch })
    }
  }

  if (context?.node.type === 'roof' && context.source === 'node') {
    void registryVersion
    const roof = context.node as RoofNode
    const parsedRoofType = RoofTypeSchema.safeParse(
      useEditor.getState().toolDefaults.roof?.roofType,
    )
    const roofType = parsedRoofType.success ? parsedRoofType.data : 'gable'
    const segmentIds = (roof.children ?? []).filter(
      (id) => nodes[id as AnyNodeId]?.type === 'roof-segment',
    )
    const segmentSet = new Set<string>(segmentIds)
    let segmentIndex = 0
    const actions = [
      ...bindings.getRoofFootprintSources(roofType).map((source) => ({
        id: `roof-draw-from-${source.value}`,
        kind: 'action' as const,
        label: source.value === 'draw' ? 'Draw Footprint' : `Create from ${source.label}`,
        onSelect: () => bindings.activateRoofFootprintSource(source.value),
      })),
      {
        id: 'roof-draw-segment',
        kind: 'action' as const,
        label: 'Draw Segment',
        onSelect: () => {
          triggerSFX('sfx:item-pick')
          const editor = useEditor.getState()
          editor.setTool('roof')
          if (editor.mode !== 'build') editor.setMode('build')
        },
      },
      ...Object.values(nodes).flatMap((node) => {
        if (!node) return []
        if (node.type === 'roof-segment' && segmentSet.has(node.id)) {
          segmentIndex += 1
          return [
            {
              id: `roof-segment-${node.id}`,
              kind: 'action' as const,
              label: `Segment ${segmentIndex}: ${node.roofType}`,
              onSelect: () => setSelection({ selectedIds: [node.id] }),
            },
          ]
        }
        if (node.parentId && segmentSet.has(node.parentId)) {
          return [
            {
              id: `roof-accessory-${node.id}`,
              kind: 'action' as const,
              label: node.name || node.type,
              onSelect: () => setSelection({ selectedIds: [node.id] }),
            },
          ]
        }
        return []
      }),
      ...bindings.collectRoofFeatures().map((feature) => ({
        id: `roof-add-${feature.id}`,
        kind: 'action' as const,
        label: `Add ${feature.label}`,
        onSelect: () => bindings.activateRoofFeatureTool(feature),
      })),
    ]
    const key = `node:${roof.id}:roof-actions`
    const page = paginationKey === key ? paginationPage : 0
    const current = getPage(actions, page, ROWS_PER_PAGE)
    return {
      mark: `${actions.length} controls`,
      onDelete: deleteSelectedNode,
      onPageChange: (nextPage) => setSettingsNavigation(key, nextPage),
      page: current.currentPage,
      pageCount: current.pageCount,
      rows: current.items,
      title: context.title,
    }
  }

  if (context) {
    const sourceRows = [
      ...collectRoofActionRows(context.node, bindings),
      ...collectXRSettingRows(context),
    ]
    const key = context.key
    const page = paginationKey === key ? paginationPage : 0
    const current = getPage(sourceRows, page, ROWS_PER_PAGE)
    return {
      emptyMessage: 'No spatial settings are exposed for this item yet.',
      mark: `${sourceRows.length} controls`,
      onDelete:
        context.source === 'node' && context.definition.capabilities.deletable !== false
          ? deleteSelectedNode
          : undefined,
      onPageChange: (nextPage) => setSettingsNavigation(key, nextPage),
      page: current.currentPage,
      pageCount: current.pageCount,
      rows: current.items.map((row) =>
        registryRowModel(row, context, materials, referenceNodes, update),
      ),
      title: context.title,
    }
  }

  const cycleFloor = () => {
    if (!activeLevel) return
    const index = levels.findIndex((level) => level.id === activeLevel.id)
    const next = levels[(index + 1) % levels.length]
    if (next) setSelection({ buildingId: resolvedBuildingId, levelId: next.id })
  }
  const addFloorAt = (level: number) => {
    if (!resolvedBuildingId) return
    const newLevel = LevelNode.parse({
      level,
      height: DEFAULT_LEVEL_HEIGHT,
      children: [],
      parentId: resolvedBuildingId,
    })
    createNode(newLevel, resolvedBuildingId as AnyNodeId)
    setSelection({ buildingId: resolvedBuildingId, levelId: newLevel.id })
  }
  const removeFloor = () => {
    if (!(activeLevel && activeLevel.level !== 0)) return
    const index = levels.findIndex((level) => level.id === activeLevel.id)
    const fallback = levels[index - 1] ?? levels[index + 1]
    deleteNode(activeLevel.id)
    setSelection({
      buildingId: resolvedBuildingId,
      levelId: fallback?.id ?? null,
    })
  }
  const page = paginationKey === DEFAULT_SETTINGS_CONTEXT_KEY ? paginationPage : 0
  const rows: XRWandSettingRow[] =
    page === 0
      ? [
          {
            id: 'floor',
            kind: 'choice',
            label: 'Floor',
            onSelect: levels.length ? cycleFloor : undefined,
            value: activeLevel ? getLevelDisplayName(activeLevel) : 'No floors',
          },
          {
            actions: [
              {
                id: 'add-floor',
                label: 'Add floor',
                onSelect: () =>
                  addFloorAt(
                    levels.length ? Math.max(...levels.map((entry) => entry.level)) + 1 : 0,
                  ),
              },
              {
                id: 'add-basement',
                label: 'Add basement',
                onSelect: () =>
                  addFloorAt(
                    levels.length ? Math.min(...levels.map((entry) => entry.level)) - 1 : -1,
                  ),
              },
            ],
            id: 'floor-actions',
            kind: 'actions',
          },
          {
            disabled: !activeLevel || activeLevel.level === 0,
            id: 'remove-floor',
            kind: 'action',
            label: 'Remove selected floor',
            onSelect: removeFloor,
          },
          {
            id: 'editor-mode',
            kind: 'choice',
            label: 'Editor mode',
            value: mode,
          },
        ]
      : [
          {
            id: 'grid-snap',
            kind: 'choice',
            label: 'Grid snap',
            onSelect: cycleGridSnapStep,
            value: `${gridSnapStep} m`,
          },
          {
            id: 'player-mode',
            kind: 'choice',
            label: 'XR scale',
            onSelect: toggleXRPlayerMode,
            value: playerMode === XR_PLAYER_MODES.GOD ? 'God' : 'Human',
          },
          {
            id: 'panel-scale',
            kind: 'stepper',
            label: 'Panel size',
            max: XR_WAND_PANEL_SCALE_MAX,
            min: XR_WAND_PANEL_SCALE_MIN,
            onChange: setPanelScale,
            step: XR_WAND_PANEL_SCALE_STEP,
            value: panelScale,
          },
          {
            id: 'wall-snap',
            kind: 'choice',
            label: 'Wall snap',
            onSelect: () => setSnappingMode('wall', cycleSnappingModeIn('wall', wallSnappingMode)),
            value: getSnappingModeLabel(wallSnappingMode),
          },
        ]

  return {
    headerActions: [
      {
        disabled: !canUndo || !interactionIdle,
        id: 'undo',
        label: 'Undo',
        onSelect: runUndo,
      },
      {
        disabled: !canRedo || !interactionIdle,
        id: 'redo',
        label: 'Redo',
        onSelect: runRedo,
      },
      {
        disabled: playerMode !== XR_PLAYER_MODES.GOD || !interactionIdle,
        id: 'reset-view',
        label: 'Reset view',
        onSelect: requestGodScaleReset,
      },
    ],
    mark: 'selection-aware',
    onPageChange: (nextPage) => setSettingsNavigation(DEFAULT_SETTINGS_CONTEXT_KEY, nextPage),
    page,
    pageCount: DEFAULT_SETTINGS_PAGES,
    rows,
    title: 'Settings',
  }
}
