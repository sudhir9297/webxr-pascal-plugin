'use client'

import { activateCatalogItem, filterCatalogItems, furnishTools, isCatalogItemSelected, useEditor } from '@pascal-app/editor'
import type { XRWandBuildItem, XRWandItemsModel } from '../../../../xr/wand'
import type { PascalXRWandBindings } from '../bindings'

export function usePascalXRWandItemsModel(_bindings: PascalXRWandBindings, category?: (typeof furnishTools)[number]['catalogCategory']): XRWandBuildItem[] {
  const selectedItem = useEditor((state) => state.selectedItem)
  return filterCatalogItems({ category }).map((item) => ({
    active: isCatalogItemSelected(item, selectedItem),
    icon: { src: item.thumbnail },
    id: `item-${item.id}`,
    label: item.name,
    onSelect: () => activateCatalogItem(item),
  }))
}

export function usePascalXRWandItemsPanelModel(bindings: PascalXRWandBindings): XRWandItemsModel {
  const catalogCategory = useEditor((state) => state.catalogCategory)
  const categoryId = furnishTools.find((category) => category.catalogCategory === catalogCategory)?.catalogCategory ?? furnishTools[0]!.catalogCategory
  const items = usePascalXRWandItemsModel(bindings, categoryId)
  return {
    categoryId,
    items,
    categories: furnishTools.map((category) => ({
      id: category.catalogCategory, label: category.label, icon: { src: category.iconSrc },
      active: category.catalogCategory === categoryId,
      onSelect: () => useEditor.getState().setCatalogCategory(category.catalogCategory),
    })),
  }
}
