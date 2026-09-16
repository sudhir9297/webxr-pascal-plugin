import type { XRWandAdapter } from '../../../xr/wand'
import type { PascalXRWandBindings } from './bindings'
import { usePascalXRWandBuildModel } from './models/build-model'
import { usePascalXRWandPaintModel } from './models/paint-model'
import { usePascalXRWandSettingsModel } from './models/settings-model'

export function createPascalXRWandAdapter(bindings: PascalXRWandBindings): XRWandAdapter {
  return {
    useBuildModel: () => usePascalXRWandBuildModel(bindings),
    usePaintModel: () => usePascalXRWandPaintModel(bindings),
    useSettingsModel: (options) => usePascalXRWandSettingsModel(bindings, options),
  }
}
