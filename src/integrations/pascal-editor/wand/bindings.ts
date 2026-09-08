import type { RoofType } from '@pascal-app/core'
import type { FloorplanMode } from '@pascal-app/editor'

export type PascalXRBuildType = {
  iconSrc: string
  id: string
  kind?: string
  label: string
  mode?: 'material-paint' | 'terrain-sculpt'
  paletteOrder?: number
}

export type PascalXRMepItem = {
  iconSrc: string
  id: string
  kind: string
  label: string
}

export type PascalXRRoofFeature = {
  iconSrc: string
  id: string
  kind?: string
  label: string
}

export type PascalXRRoofFootprintSource = 'draw' | 'room' | 'walls'

export type PascalXRWandBindings = {
  activateBuildTool: (kind: string) => void
  activateModularCabinetTool: () => void
  activatePaintMode: () => void
  activateRoofFeatureTool: (feature: PascalXRRoofFeature) => void
  activateRoofFootprintSource: (source: PascalXRRoofFootprintSource) => void
  activateRoofType: (roofType: RoofType) => void
  activateSelectMode: () => void
  activateTerrainSculptMode: () => void
  collectBuildTypes: (floorplanMode: FloorplanMode) => PascalXRBuildType[]
  collectRoofFeatures: () => PascalXRRoofFeature[]
  getRoofFootprintSources: (roofType: RoofType) => readonly {
    label: string
    value: PascalXRRoofFootprintSource
  }[]
  roofTypeOptions: ReadonlyArray<{ label: string; value: RoofType }>
  xrMepItems: readonly PascalXRMepItem[]
}
