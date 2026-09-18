'use client'

import { useTerrainPanelRows } from '@pascal-app/editor'
import type { XRWandSettingsModel } from '../../../../xr/wand'

export function usePascalXRWandTerrainModel(): XRWandSettingsModel {
  const rows = useTerrainPanelRows()
  return { rows, title: 'Terrain', mark: `${rows.length} controls`, page: 0, pageCount: 1 }
}
