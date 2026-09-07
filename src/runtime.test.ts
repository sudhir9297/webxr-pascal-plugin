import { describe, expect, test } from 'bun:test'
import { DefaultXRController, DefaultXRHand } from '@react-three/xr'
import {
  createWebXRStore,
  resolveRuntimeSource,
  VisibleXRController,
  VisibleXRHand,
} from './runtime'

describe('WebXR runtime selection', () => {
  test('uses a native headset when immersive VR is supported', () => {
    expect(resolveRuntimeSource({ development: true, nativeSupported: true })).toBe('native')
  })

  test('uses IWER only for local development without native XR', () => {
    expect(resolveRuntimeSource({ development: true, nativeSupported: false })).toBe('emulated')
    expect(resolveRuntimeSource({ development: false, nativeSupported: false })).toBe('unsupported')
  })
})

describe('WebXR tracked input models', () => {
  test('uses the default profile controller and hand models', () => {
    const store = createWebXRStore()

    expect(store.getState().controller).toBe(VisibleXRController)
    expect(store.getState().hand).toBe(VisibleXRHand)
    expect(VisibleXRController({}).type).toBe(DefaultXRController)
    expect(VisibleXRController({}).props.model).not.toBe(false)
    expect(VisibleXRHand({}).type).toBe(DefaultXRHand)
    expect(VisibleXRHand({}).props.model).not.toBe(false)

    store.destroy()
  })
})
