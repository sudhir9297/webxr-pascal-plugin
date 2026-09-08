'use client'

import { type RoofType, RoofType as RoofTypeSchema, useRegistryVersion } from '@pascal-app/core'
import { useEditor, useFloorplanMode } from '@pascal-app/editor'
import {
  getPageWithPinnedFirst,
  useXRWandPanelSettings,
  type XRWandBuildItem,
  type XRWandBuildModel,
} from '../../../../xr/wand'
import { useMemo } from 'react'
import type { PascalXRRoofFeature, PascalXRWandBindings } from '../bindings'

const ITEMS_PER_PAGE = 9

export function usePascalXRWandBuildModel(bindings: PascalXRWandBindings): XRWandBuildModel {
  const section = useXRWandPanelSettings((state) => state.buildSection)
  const page = useXRWandPanelSettings((state) => state.buildPage)
  const setBuildNavigation = useXRWandPanelSettings((state) => state.setBuildNavigation)
  const mode = useEditor((state) => state.mode)
  const activeTool = useEditor((state) => state.tool)
  const roofDefaults = useEditor((state) => state.toolDefaults.roof)
  const floorplanMode = useFloorplanMode((state) => state.mode)
  const registryVersion = useRegistryVersion()
  const buildTypes = useMemo(() => {
    void registryVersion
    return bindings.collectBuildTypes(floorplanMode)
  }, [bindings, floorplanMode, registryVersion])
  const roofFeatures = useMemo(() => {
    void registryVersion
    return bindings.collectRoofFeatures()
  }, [bindings, registryVersion])
  const parsedRoofType = RoofTypeSchema.safeParse(roofDefaults?.roofType)
  const activeRoofType = parsedRoofType.success ? parsedRoofType.data : 'gable'

  const entries = useMemo<XRWandBuildItem[]>(() => {
    const selectEntry: XRWandBuildItem = {
      active: mode === 'select',
      icon: { src: '/icons/select.webp' },
      id: 'select',
      label: 'Select',
      onSelect: bindings.activateSelectMode,
    }

    if (section === 'mep') {
      return [
        selectEntry,
        ...bindings.xrMepItems.map((item) => ({
          active: mode === 'build' && activeTool === item.kind,
          icon: { src: item.iconSrc },
          id: item.id,
          label: item.label,
          onSelect: () => bindings.activateBuildTool(item.kind),
        })),
      ]
    }

    if (section === 'roof') {
      const roofTypes: XRWandBuildItem[] = bindings.roofTypeOptions.map((option) => ({
        active: mode === 'build' && activeTool === 'roof' && activeRoofType === option.value,
        icon: { src: '/icons/roof.webp' },
        id: `roof-${option.value}`,
        label: option.label,
        onSelect: () => bindings.activateRoofType(option.value as RoofType),
      }))
      return [
        selectEntry,
        ...roofTypes,
        ...roofFeatures.map((feature: PascalXRRoofFeature) => ({
          active: mode === 'build' && activeTool === feature.kind,
          icon: { src: feature.iconSrc },
          id: feature.id,
          label: feature.label,
          onSelect: () => bindings.activateRoofFeatureTool(feature),
        })),
      ]
    }

    return [
      selectEntry,
      ...buildTypes.map((type) => {
        const isMepTool =
          !!activeTool &&
          (activeTool.includes('duct') ||
            activeTool.includes('pipe') ||
            activeTool === 'lineset' ||
            activeTool === 'liquid-line' ||
            activeTool === 'hvac-equipment')
        const active = type.mode
          ? mode === type.mode
          : type.id === 'kitchen'
            ? mode === 'build' && activeTool === 'cabinet'
            : type.id === 'mep'
              ? mode === 'build' && isMepTool
              : mode === 'build' && activeTool === type.kind
        return {
          active,
          icon: { src: type.iconSrc },
          id: type.id,
          label: type.label,
          onSelect: () => {
            if (type.id === 'mep') {
              bindings.activateBuildTool('duct-segment')
              setBuildNavigation('mep', 0)
            } else if (type.id === 'roof') {
              bindings.activateBuildTool('roof')
              setBuildNavigation('roof', 0)
            } else if (type.id === 'kitchen') {
              bindings.activateModularCabinetTool()
            } else if (type.mode === 'material-paint') {
              bindings.activatePaintMode()
            } else if (type.mode === 'terrain-sculpt') {
              bindings.activateTerrainSculptMode()
            } else if (type.kind) {
              bindings.activateBuildTool(type.kind)
            }
          },
        }
      }),
    ]
  }, [
    activeRoofType,
    activeTool,
    bindings,
    buildTypes,
    mode,
    roofFeatures,
    section,
    setBuildNavigation,
  ])

  const current = getPageWithPinnedFirst(entries, page, ITEMS_PER_PAGE)
  return {
    back:
      section === 'main'
        ? undefined
        : { label: 'Back', onSelect: () => setBuildNavigation('main', 0) },
    items: current.items,
    mark: `${entries.length} tools`,
    onPageChange: (nextPage) => setBuildNavigation(section, nextPage),
    page: current.currentPage,
    pageCount: current.pageCount,
    section,
    title: section === 'main' ? 'Build' : section === 'mep' ? 'MEP' : 'Roof',
  }
}
