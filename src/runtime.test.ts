import { describe, expect, test } from 'bun:test'
import { resolveRuntimeSource } from './runtime'

describe('WebXR runtime selection', () => {
  test('uses a native headset when immersive VR is supported', () => {
    expect(resolveRuntimeSource({ development: true, nativeSupported: true })).toBe('native')
  })

  test('uses IWER only for local development without native XR', () => {
    expect(resolveRuntimeSource({ development: true, nativeSupported: false })).toBe('emulated')
    expect(resolveRuntimeSource({ development: false, nativeSupported: false })).toBe('unsupported')
  })
})
