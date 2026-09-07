import { useScene } from '@pascal-app/core'

export const XR_PREVIEW_SCENE_KEY = 'pascal-xr-preview-scene'

export type WebXRPreviewSceneSnapshot = {
  collections: unknown
  installedPlugins: readonly string[]
  materials: unknown
  nodes: Record<string, unknown>
  rootNodeIds: readonly unknown[]
}

type WebXRPreviewSceneState = Omit<WebXRPreviewSceneSnapshot, 'installedPlugins' | 'materials'> & {
  installedPlugins?: readonly string[]
  materials?: unknown
}

export function createXRPreviewSceneSnapshot(
  state: WebXRPreviewSceneState,
): WebXRPreviewSceneSnapshot {
  const { collections, installedPlugins = [], materials = {}, nodes, rootNodeIds } = state
  return { collections, installedPlugins, materials, nodes, rootNodeIds }
}

export function openXRPreview(path: string) {
  try {
    const sceneState = useScene.getState() as unknown as WebXRPreviewSceneState
    localStorage.setItem(
      XR_PREVIEW_SCENE_KEY,
      JSON.stringify(createXRPreviewSceneSnapshot(sceneState)),
    )
  } catch {}

  const url = new URL(path, window.location.href)
  url.searchParams.set('source', 'live')
  const preview = window.open(
    `${url.pathname}${url.search}${url.hash}`,
    'pascal-xr-preview',
    'popup=yes,width=1280,height=800,resizable=yes,scrollbars=no',
  )
  preview?.focus()
}
