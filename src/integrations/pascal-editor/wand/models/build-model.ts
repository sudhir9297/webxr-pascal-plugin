'use client'

import { type RoofType, RoofType as RoofTypeSchema, useRegistryVersion } from '@pascal-app/core'
import { CATALOG_ITEMS, useEditor, useFloorplanMode } from '@pascal-app/editor'
import {
  getPageWithPinnedFirst,
  useXRWandPanelSettings,
  type XRWandBuildItem,
  type XRWandBuildModel,
} from '../../../../xr/wand'
import { useMemo } from 'react'
import { useViewer } from '@pascal-app/viewer'
import type { PascalXRRoofFeature, PascalXRWandBindings } from '../bindings'

// The build palette is a 4x3 grid. Keep the page size in sync with the
// available tile slots so the first page shows every slot before paginating.
const ITEMS_PER_PAGE = 12

export function usePascalXRWandBuildModel(bindings: PascalXRWandBindings): XRWandBuildModel {
  const section = useXRWandPanelSettings((state) => state.buildSection)
  const mainPage = useXRWandPanelSettings((state) => state.buildMainPage)
  const setBuildNavigation = useXRWandPanelSettings((state) => state.setBuildNavigation)
  const mode = useEditor((state) => state.mode)
  const activeTool = useEditor((state) => state.tool)
  const selectedItem = useEditor((state) => state.selectedItem)
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
      active: mode === 'select' && section === 'main',
      icon: { src: '/icons/select.webp' },
      id: 'select',
      label: 'Select',
      onSelect: () => {
        bindings.activateSelectMode()
        setBuildNavigation('main', mainPage)
      },
    }

    if (section === 'items') {
      return [
        selectEntry,
        ...CATALOG_ITEMS.map((item) => ({
          active:
            mode === 'build' &&
            activeTool === (item.tool ?? 'item') &&
            selectedItem?.id === item.id,
          icon: { src: item.thumbnail },
          id: `item-${item.id}`,
          label: item.name,
          onSelect: () => {
            bindings.activateSelectMode()
            useViewer.getState().setSelection({ selectedIds: [], zoneId: null })
            const editor = useEditor.getState()
            editor.setSelectedItem(item)
            editor.setTool(item.tool ?? 'item')
            editor.setMode('build')
          },
        })),
      ]
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

    return []
  }, [
    mainPage,
    activeRoofType,
    activeTool,
    bindings,
    buildTypes,
    mode,
    roofFeatures,
    section,
    selectedItem,
    setBuildNavigation,
  ])

  const primaryEntries = useMemo<XRWandBuildItem[]>(
    () => [
      {
        active: mode === 'select' && section === 'main',
        icon: { src: '/icons/select.webp' },
        id: 'select',
        label: 'Select',
        onSelect: () => {
          bindings.activateSelectMode()
          setBuildNavigation('main', mainPage)
        },
      },
      {
        active: section === 'items',
        icon: { src: '/icons/couch.webp' },
        id: 'items',
        label: 'Items',
        onSelect: () => {
          bindings.activateSelectMode()
          setBuildNavigation('items', 0)
        },
      },
      ...buildTypes.map((type) => ({
        active:
          type.id === 'mep'
            ? section === 'mep'
            : type.id === 'roof'
              ? section === 'roof'
              : type.mode
                ? mode === type.mode
                : mode === 'build' && activeTool === type.kind,
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
          } else if (type.mode === 'material-paint') {
            bindings.activatePaintMode()
            setBuildNavigation('main', mainPage)
          } else if (type.mode === 'terrain-sculpt') {
            bindings.activateTerrainSculptMode()
            setBuildNavigation('main', mainPage)
          } else if (type.id === 'kitchen') {
            bindings.activateModularCabinetTool()
            setBuildNavigation('main', mainPage)
          } else if (type.kind) {
            bindings.activateBuildTool(type.kind)
            setBuildNavigation('main', mainPage)
          }
        },
      })),
    ],
    [activeTool, bindings, buildTypes, mode, section, setBuildNavigation, mainPage],
  )
  const primary = getPageWithPinnedFirst(primaryEntries, mainPage, ITEMS_PER_PAGE)
  return {
    back:
      section === 'main'
        ? undefined
        : {
            label: 'Close',
            onSelect: () => setBuildNavigation('main', mainPage),
          },
    items: primary.items,
    mark: `${primaryEntries.length} tools`,
    onPageChange: (nextPage) => setBuildNavigation('main', nextPage),
    page: primary.currentPage,
    pageCount: primary.pageCount,
    section,
    secondaryItems: section === 'main' ? undefined : entries.filter((item) => item.id !== 'select'),
    secondaryTitle: section === 'items' ? 'Items' : section === 'mep' ? 'MEP' : 'Roof',
    detailMode: mode === 'material-paint' ? 'paint' : undefined,
    title: 'Build',
  }
}
