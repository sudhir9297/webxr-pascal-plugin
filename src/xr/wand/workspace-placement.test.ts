import { describe, expect, test } from 'bun:test'
import { Group, Vector3 } from 'three'
import {
  constrainWorkspacePosition,
  placeWorkspace,
  workspaceParentPoint,
  WorkspaceDrag,
} from './workspace-placement'

describe('floating workspace placement and drag ownership', () => {
  test('opens ahead of the user without inheriting head pitch', () => {
    const eye = new Vector3(5, 2, -3)
    const point = placeWorkspace(eye, new Vector3(1, -1, 0), new Vector3())
    expect(point.x).toBeCloseTo(6.05)
    expect(point.y).toBeCloseTo(1.9)
    expect(point.z).toBe(-3)
    expect(eye.toArray()).toEqual([5, 2, -3])
  })

  test('converts ray hits into the workspace parent coordinate system before dragging', () => {
    const parent = new Group()
    parent.position.set(4, 2, -3)
    parent.rotation.y = Math.PI / 2
    parent.scale.setScalar(2)
    const workspace = new Group()
    parent.add(workspace)
    parent.updateWorldMatrix(true, true)

    const local = new Vector3(0.25, -0.5, 1)
    const world = parent.localToWorld(local.clone())
    expect(workspaceParentPoint(workspace, world).toArray()).toEqual(local.toArray())
  })

  test('looking vertically still gives a finite, reachable position', () => {
    const point = placeWorkspace(new Vector3(), new Vector3(0, 1, 0), new Vector3())
    expect(point.toArray()).toEqual([0, -0.1, -1.05])
  })

  test('a second pointer cannot steal, move, or release a drag', () => {
    const drag = new WorkspaceDrag()
    const target = new Vector3()
    expect(drag.start(1, new Vector3(0, 0, -1), new Vector3(0, 0.3, -1))).toBe(true)
    expect(drag.start(2, new Vector3(), new Vector3())).toBe(false)
    expect(drag.move(2, new Vector3(1, 0, -1), new Vector3(), target)).toBe(false)
    expect(drag.end(2)).toBe(false)
    expect(drag.move(1, new Vector3(0.2, 0, -1), new Vector3(), target)).toBe(true)
    expect(target.toArray()).toEqual([0.2, 0.3, -1])
    expect(drag.end(1)).toBe(true)
    expect(drag.move(1, new Vector3(), new Vector3(), target)).toBe(false)
    expect(drag.start(2, new Vector3(), new Vector3())).toBe(true)
  })

  test('independent workspace drags do not share their grab offsets', () => {
    const a = new WorkspaceDrag()
    const b = new WorkspaceDrag()
    a.start(1, new Vector3(0, 0, -1), new Vector3(0, 0.2, -1))
    b.start(2, new Vector3(0, 0, -1), new Vector3(0, -0.3, -1))
    const target = new Vector3()
    a.move(1, new Vector3(0, 0, -1), new Vector3(), target)
    expect(target.y).toBeCloseTo(0.2)
  })

  test('keeps pointer delta stable when the live viewer pose changes coordinate basis', () => {
    const drag = new WorkspaceDrag()
    const target = new Vector3()
    drag.start(1, new Vector3(0, 0, -1), new Vector3(0, -0.1, -1.05))
    expect(drag.move(1, new Vector3(0.12, 0.04, -1), new Vector3(0, 6, 8), target)).toBe(
      true,
    )
    expect(target.toArray()).toEqual([0.12, -0.060000000000000005, -1.05])
  })

  test('bounds distance and rejects invalid tracking data', () => {
    const eye = new Vector3(10, 2, 3)
    const near = eye.clone().add(new Vector3(0, 0, -0.1))
    const far = eye.clone().add(new Vector3(0, 0, -100))
    expect(constrainWorkspacePosition(near, eye)).toBe(true)
    expect(near.distanceTo(eye)).toBeCloseTo(0.8)
    expect(constrainWorkspacePosition(far, eye)).toBe(true)
    expect(far.distanceTo(eye)).toBeCloseTo(2.5)
    expect(constrainWorkspacePosition(eye.clone(), eye)).toBe(false)
    expect(constrainWorkspacePosition(new Vector3(NaN, 0, 0), eye)).toBe(false)
  })
})
