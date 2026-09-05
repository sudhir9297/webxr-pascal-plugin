import type { Plugin } from '@pascal-app/core'
import type { ComponentType } from 'react'

export * from './xr/god-mode'
export * from './xr/human-mode'

/** WebXR plugin manifest loaded by the editor host. */
export const webXRPlugin: Plugin = {
  id: 'webxr:core',
  apiVersion: 1,
  nodes: [],
}

/** Editor-owned sidebar panel for WebXR tools. */
export const webXRHostPanel: WebXRHostPanel = {
  id: 'webxr:panel',
  pluginId: webXRPlugin.id,
  label: 'WebXR',
  description: 'Build and configure immersive WebXR experiences.',
  creator: {
    name: 'WebXR',
    url: 'https://www.w3.org/TR/webxr/',
  },
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
