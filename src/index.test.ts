import { describe, expect, test } from 'bun:test'
import { webXRHostPanel, webXRPlugin } from './index'

describe('WebXR manifest', () => {
  test('exports the stable WebXR identity', () => {
    expect(webXRPlugin).toEqual({
      id: 'webxr:core',
      apiVersion: 1,
      nodes: [],
    })
  })

  test('exports an installed sidebar panel with a VR headset icon', () => {
    expect(webXRHostPanel.pluginId).toBe(webXRPlugin.id)
    expect(webXRHostPanel.defaultInstalled).toBe(true)
    expect(webXRHostPanel.icon).toEqual({
      kind: 'iconify',
      name: 'fa6-solid:vr-cardboard',
    })
  })
})
