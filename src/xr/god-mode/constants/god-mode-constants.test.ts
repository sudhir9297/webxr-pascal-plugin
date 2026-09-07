import { describe, expect, test } from 'bun:test'
import { Object3D, PerspectiveCamera, Vector3 } from 'three'
import { GOD_ORIGIN_POSITION, GOD_ORIGIN_ROTATION } from './god-mode-constants'

describe('God-mode initial XR pose', () => {
  test('places a neutral headset view on the editable scene', () => {
    const origin = new Object3D()
    const headset = new PerspectiveCamera()
    origin.position.copy(GOD_ORIGIN_POSITION)
    origin.rotation.copy(GOD_ORIGIN_ROTATION)
    headset.position.set(0, 1.6, 0)
    origin.add(headset)
    origin.updateWorldMatrix(true, true)

    const position = headset.getWorldPosition(new Vector3())
    const direction = headset.getWorldDirection(new Vector3())
    const sceneCenterHeight = 1.25
    const distance = (sceneCenterHeight - position.y) / direction.y
    const focus = position.addScaledVector(direction, distance)

    expect(distance).toBeGreaterThan(0)
    expect(Math.abs(focus.x)).toBeLessThanOrEqual(6)
    expect(Math.abs(focus.z)).toBeLessThanOrEqual(6)
  })
})
