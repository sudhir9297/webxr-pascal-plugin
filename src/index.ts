import type { Plugin } from '@pascal-app/core'
import type { ComponentType } from 'react'
import { WEBXR_PLUGIN_ID } from './runtime'

export {
  useWebXRFeature,
  WEBXR_ORIGIN_POSITION,
  WEBXR_PLUGIN_ID,
  type WebXRFeature,
  type WebXRStoreFactory,
  type WebXRViewerConfig,
} from './runtime'
export { WebXRToolbarButton } from './toolbar-button'

export const webXRPlugin: Plugin = {
  id: WEBXR_PLUGIN_ID,
  apiVersion: 1,
  nodes: [],
}

export const webXRHostPanel: WebXRHostPanel = {
  id: 'webxr:panel',
  pluginId: webXRPlugin.id,
  label: 'WebXR',
  description: 'Enter an immersive WebXR session from the editor.',
  creator: { name: 'WebXR', url: 'https://www.w3.org/TR/webxr/' },
  pluginUrl: 'https://www.w3.org/TR/webxr/',
  icon: { kind: 'iconify', name: 'fa6-solid:vr-cardboard' },
  component: () => import('./panel'),
  defaultInstalled: true,
}

type WebXRHostPanel = {
  id: string
  pluginId: string
  label: string
  description: string
  creator: { name: string; url: string }
  pluginUrl: string
  icon: { kind: 'iconify'; name: string }
  component: () => Promise<{ default: ComponentType }>
  defaultInstalled: boolean
}
