'use client'

import {
  getLibraryMaterialIdFromRef,
  getLibraryMaterialsVersion,
  getMaterialsForCategory,
  MATERIAL_CATEGORIES,
  type MaterialCategory,
  subscribeLibraryMaterials,
  toLibraryMaterialRef,
} from '@pascal-app/core'
import {
  cyclePaintScope,
  getActivePaintMaterialLabel,
  hasActivePaintMaterial,
  type PaintHoverInfo,
  paintScopeLabel,
  useEditor,
} from '@pascal-app/editor'
import { useXRWandPanelSettings, type XRWandPaintModel } from '../../../../xr/wand'
import { useMemo, useRef, useSyncExternalStore } from 'react'
import type { PascalXRWandBindings } from '../bindings'

function labelCategory(category: string) {
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`
}

export function usePascalXRWandPaintModel(bindings: PascalXRWandBindings): XRWandPaintModel {
  const categoryIndex = useXRWandPanelSettings((state) => state.paintCategoryIndex)
  const setPaintNavigation = useXRWandPanelSettings((state) => state.setPaintNavigation)
  const mode = useEditor((state) => state.mode)
  const activePaintMaterial = useEditor((state) => state.activePaintMaterial)
  const activePaintTarget = useEditor((state) => state.activePaintTarget)
  const paintEraser = useEditor((state) => state.paintEraser)
  const paintHover = useEditor((state) => state.paintHover)
  const paintScope = useEditor((state) => state.paintScope)
  const setActivePaintMaterial = useEditor((state) => state.setActivePaintMaterial)
  const setPaintEraser = useEditor((state) => state.setPaintEraser)
  const setPaintScope = useEditor((state) => state.setPaintScope)
  const lastPaintHover = useRef<PaintHoverInfo | null>(null)
  if (mode !== 'material-paint') lastPaintHover.current = null
  else if (paintHover) lastPaintHover.current = paintHover
  const libraryVersion = useSyncExternalStore(
    subscribeLibraryMaterials,
    getLibraryMaterialsVersion,
    getLibraryMaterialsVersion,
  )

  const availableCategories = useMemo(() => {
    void libraryVersion
    return MATERIAL_CATEGORIES.filter((category) => getMaterialsForCategory(category).length > 0)
  }, [libraryVersion])
  const activeCategoryIndex = availableCategories.length
    ? categoryIndex % availableCategories.length
    : 0
  const category = (availableCategories[activeCategoryIndex] ??
    availableCategories[0] ??
    'colors') as MaterialCategory
  const materials = getMaterialsForCategory(category)
  const selectedId = getLibraryMaterialIdFromRef(activePaintMaterial?.materialPreset)
  const paintContext = paintHover ?? lastPaintHover.current
  const paintEnabled =
    mode === 'material-paint' && (paintEraser || hasActivePaintMaterial(activePaintMaterial))
  const availableScopes = paintContext?.scopes ?? ['single']
  const effectivePaintScope = availableScopes.includes(paintScope) ? paintScope : 'single'
  const scopeLabel =
    mode !== 'material-paint'
      ? 'Choose a material or activate Paint / Erase'
      : !paintEnabled
        ? 'Choose a material'
        : paintContext
          ? `${paintEraser ? 'Erase' : 'Paint'}: ${paintScopeLabel(effectivePaintScope, paintContext)}`
          : 'Aim at a surface'

  const changeCategory = (direction: -1 | 1) => {
    if (availableCategories.length < 2) return
    setPaintNavigation(
      (activeCategoryIndex + direction + availableCategories.length) % availableCategories.length,
      0,
    )
  }

  return {
    activeMaterialLabel: getActivePaintMaterialLabel(activePaintMaterial),
    canPaint: hasActivePaintMaterial(activePaintMaterial),
    stopPainting: bindings.activateSelectMode,
    categories: availableCategories.map((value, index) => ({
      id: value,
      label: labelCategory(value),
      selected: value === category,
      onSelect: () => setPaintNavigation(index, 0),
    })),
    brushActive: mode === 'material-paint' && !paintEraser,
    category: {
      canChange: availableCategories.length > 1,
      label: labelCategory(category),
      next: () => changeCategory(1),
      position: activeCategoryIndex + 1,
      previous: () => changeCategory(-1),
      total: availableCategories.length,
    },
    eraserActive: mode === 'material-paint' && paintEraser,
    items: materials.map((item) => ({
      icon: {
        color: item.previewColor ?? item.preset.mapProperties.color,
        src: item.previewThumbnailUrl,
      },
      id: item.id,
      label: item.label,
      onSelect: () => {
        bindings.activatePaintMode()
        setActivePaintMaterial({
          materialPreset: toLibraryMaterialRef(item.id),
          sourceTarget: activePaintTarget,
        })
      },
      selected: !paintEraser && selectedId === item.id,
    })),
    mark: mode === 'material-paint' ? (paintEraser ? 'Erasing' : 'Painting') : 'Browse materials',
    onPageChange: (nextPage) => setPaintNavigation(activeCategoryIndex, nextPage),
    page: 0,
    pageCount: 1,
    scope: {
      disabled: !paintEnabled || !paintContext || availableScopes.length <= 1,
      label: scopeLabel,
      onSelect: () => setPaintScope(cyclePaintScope(effectivePaintScope, availableScopes)),
      selected: availableScopes.length > 1 && effectivePaintScope !== 'single',
    },
    startPainting: () => {
      bindings.activatePaintMode()
      setPaintEraser(false)
    },
    toggleEraser: () => {
      bindings.activatePaintMode()
      setPaintEraser(mode !== 'material-paint' || !paintEraser)
    },
  }
}
