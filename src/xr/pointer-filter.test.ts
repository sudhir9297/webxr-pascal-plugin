import { describe, expect, test } from 'bun:test'
import { Group, Mesh } from 'three'
import { isDirectR3FPointerTarget, isR3FPointerTarget } from './pointer-filter'

function markInteractive(object: Group | Mesh) {
  ;(object as unknown as { __r3f: unknown }).__r3f = { eventCount: 6 }
}

describe('isDirectR3FPointerTarget', () => {
  test('keeps an explicit collision mesh ahead of its passive rendered sibling', () => {
    const passiveWallBody = new Mesh()
    const wallCollisionMesh = new Mesh()
    const interactiveLevelWrapper = new Group()

    markInteractive(interactiveLevelWrapper)
    interactiveLevelWrapper.add(passiveWallBody, wallCollisionMesh)
    markInteractive(wallCollisionMesh)

    expect(isDirectR3FPointerTarget(passiveWallBody)).toBe(false)
    expect(isDirectR3FPointerTarget(wallCollisionMesh)).toBe(true)
    expect(isR3FPointerTarget(passiveWallBody)).toBe(false)
    expect(isR3FPointerTarget(wallCollisionMesh)).toBe(true)
  })

  test('keeps an explicit collision child ahead of its passive rendered parent', () => {
    const passiveWallBody = new Mesh()
    const wallCollisionMesh = new Mesh()
    const interactiveWrapper = new Group()

    markInteractive(interactiveWrapper)
    markInteractive(wallCollisionMesh)
    passiveWallBody.add(wallCollisionMesh)
    interactiveWrapper.add(passiveWallBody)

    expect(isR3FPointerTarget(passiveWallBody)).toBe(false)
    expect(isR3FPointerTarget(wallCollisionMesh)).toBe(true)
  })

  test('inherits pointer handlers for nested imported meshes', () => {
    const interactiveItemWrapper = new Group()
    const importedGroup = new Group()
    const importedMesh = new Mesh()
    markInteractive(interactiveItemWrapper)
    interactiveItemWrapper.add(importedGroup)
    importedGroup.add(importedMesh)

    expect(isR3FPointerTarget(importedMesh)).toBe(true)
  })

  test('rejects geometry with no eventful ancestor', () => {
    expect(isR3FPointerTarget(new Mesh())).toBe(false)
  })
})
