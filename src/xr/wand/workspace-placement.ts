import { type Object3D, Vector3 } from 'three'

export const WORKSPACE_DISTANCE = 1.05
export const WORKSPACE_CONTENT_SCALE = 0.62

export function workspaceParentPoint(root: Object3D, worldPoint: Vector3, target = new Vector3()) {
  target.copy(worldPoint)
  root.parent?.worldToLocal(target)
  return target
}

export function placeWorkspace(eye: Vector3, direction: Vector3, target: Vector3) {
  target.set(direction.x, 0, direction.z)
  if (target.lengthSq() < 0.0001) target.set(0, 0, -1)
  target.normalize().multiplyScalar(WORKSPACE_DISTANCE).add(eye)
  target.y -= 0.1
  return target
}

export function constrainWorkspacePosition(position: Vector3, eye: Vector3) {
  const distance = position.distanceTo(eye)
  if (!Number.isFinite(distance)) return false
  if (distance < 0.001) return false
  position
    .sub(eye)
    .multiplyScalar(Math.min(2.5, Math.max(0.8, distance)) / distance)
    .add(eye)
  return true
}

export class WorkspaceDrag {
  pointerId: number | null = null
  private offset = new Vector3()

  start(pointerId: number, point: Vector3, position: Vector3) {
    if (this.pointerId !== null) return false
    this.pointerId = pointerId
    this.offset.copy(position).sub(point)
    return true
  }

  move(pointerId: number, point: Vector3, _eye: Vector3, target: Vector3) {
    if (this.pointerId !== pointerId) return false
    target.copy(point).add(this.offset)
    return target.toArray().every(Number.isFinite)
  }

  end(pointerId: number) {
    if (this.pointerId !== pointerId) return false
    this.pointerId = null
    return true
  }
}
