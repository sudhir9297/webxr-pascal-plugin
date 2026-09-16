import { Euler, Matrix4, type Object3D, Quaternion, Vector3 } from 'three'

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

export function constrainWorkspacePosition(position: Vector3, eye: Vector3, radius: number) {
  const distance = position.distanceTo(eye)
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius < 0.001) return false
  if (distance < 0.001) return false
  position
    .sub(eye)
    .multiplyScalar(radius / distance)
    .add(eye)
  return true
}

const UP = new Vector3(0, 1, 0)
const UNIT_SCALE = new Vector3(1, 1, 1)

/** Translation follows walking; orientation comes only from the player rig. */
export class WorkspaceAnchor {
  readonly position = new Vector3()
  readonly rotation = new Quaternion()
  private matrix = new Matrix4()
  private inverseParent = new Matrix4()

  update(eye: Vector3, rigDirection: Vector3) {
    this.position.copy(eye)
    if (rigDirection.x * rigDirection.x + rigDirection.z * rigDirection.z > 0.0001) {
      this.rotation.setFromAxisAngle(UP, Math.atan2(-rigDirection.x, -rigDirection.z))
    }
  }

  apply(group: Object3D) {
    this.matrix.compose(this.position, this.rotation, UNIT_SCALE)
    if (group.parent) {
      group.parent.updateWorldMatrix(true, false)
      this.inverseParent.copy(group.parent.matrixWorld).invert()
      this.matrix.premultiply(this.inverseParent)
    }
    // Keep the complete matrix: decomposition would introduce shear under a
    // rotated, nonuniformly scaled host parent.
    group.matrixAutoUpdate = false
    group.matrix.copy(this.matrix)
    group.matrixWorldNeedsUpdate = true
    group.updateWorldMatrix(false, true)
  }
}

/** Capture gaze once, keeping the panel center below the selected-object sightline. */
export function selectionWorkspacePosition(eye: Vector3, direction: Vector3, target: Vector3) {
  target.copy(direction).normalize().multiplyScalar(WORKSPACE_DISTANCE).add(eye)
  target.y -= 0.38
  return target
}

/** Orbit rather than cutting through the viewer when recalling from behind. */
export function approachWorkspace(position: Vector3, target: Vector3, delta: number, speed: number) {
  const blend = 1 - Math.exp(-speed * delta)
  const radius = position.length() + (target.length() - position.length()) * blend
  const yaw = Math.atan2(position.x, -position.z)
  const targetYaw = Math.atan2(target.x, -target.z)
  const nextYaw = yaw + Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw)) * blend
  const pitch = Math.atan2(position.y, Math.hypot(position.x, position.z))
  const targetPitch = Math.atan2(target.y, Math.hypot(target.x, target.z))
  const nextPitch = pitch + (targetPitch - pitch) * blend
  return position.set(
    Math.sin(nextYaw) * Math.cos(nextPitch) * radius,
    Math.sin(nextPitch) * radius,
    -Math.cos(nextYaw) * Math.cos(nextPitch) * radius,
  )
}

/** Recall owns the empty workspace; dragging owns only the child offset. */
export class WorkspaceLayout {
  readonly position = new Vector3()
  readonly panelOffset = new Vector3()
  private recallTarget = new Vector3()
  private offsetTarget = new Vector3()

  recall(position: Vector3, initial = false) {
    this.recallTarget.copy(position)
    if (initial) {
      this.position.copy(position)
      this.panelOffset.set(0, 0, 0)
      this.offsetTarget.set(0, 0, 0)
    }
  }

  startDrag() {
    // Stop an in-flight recall before recording the pointer's local grab offset.
    this.recallTarget.copy(this.position)
    this.offsetTarget.copy(this.panelOffset)
  }

  dragTo(offset: Vector3) {
    this.offsetTarget.copy(offset)
  }

  resetPanelPosition() {
    this.offsetTarget.set(0, 0, 0)
  }

  update(delta: number, recallSpeed: number) {
    approachWorkspace(this.position, this.recallTarget, delta, recallSpeed)
    // Interpolate around the eyes in the recall group's yaw-only local frame.
    // A straight lerp would cut inside the orbit while a drag is smoothing.
    this.localEye.set(0, -this.position.y, Math.hypot(this.position.x, this.position.z))
    this.relativePosition.copy(this.panelOffset).sub(this.localEye)
    this.relativeTarget.copy(this.offsetTarget).sub(this.localEye)
    approachWorkspace(this.relativePosition, this.relativeTarget, delta, 24)
    this.panelOffset.copy(this.relativePosition).add(this.localEye)
  }

  apply(workspace: Object3D, panel: Object3D, eye: Vector3, delta?: number) {
    workspace.position.copy(this.position)
    // A yaw-only frame keeps a saved sideways offset sideways after any recall.
    if (Math.hypot(this.position.x, this.position.z) > 0.0001) {
      workspace.rotation.set(0, Math.atan2(-this.position.x, -this.position.z), 0)
    }
    workspace.updateWorldMatrix(true, false)
    panel.position.copy(this.panelOffset)
    workspace.worldToLocal(this.localEye.copy(eye))
    workspaceFacing(this.relativePosition.copy(panel.position).sub(this.localEye), panel.quaternion, delta)
    panel.updateWorldMatrix(false, true)
  }

  private localEye = new Vector3()
  private relativePosition = new Vector3()
  private relativeTarget = new Vector3()
}

const facingAngles = new Euler(0, 0, 0, 'YXZ')

export function workspaceFacing(position: Vector3, target: Quaternion, delta?: number) {
  facingAngles.setFromQuaternion(target, 'YXZ')
  const horizontal = Math.hypot(position.x, position.z)
  const yaw = horizontal > 0.0001 ? Math.atan2(-position.x, -position.z) : facingAngles.y
  const pitch = Math.atan2(position.y, horizontal)
  const blend = delta === undefined ? 1 : 1 - Math.exp(-18 * delta)
  const yawDelta = Math.atan2(Math.sin(yaw - facingAngles.y), Math.cos(yaw - facingAngles.y))
  facingAngles.set(
    facingAngles.x + (pitch - facingAngles.x) * blend,
    facingAngles.y + yawDelta * blend,
    0,
    'YXZ',
  )
  // Interpolate pitch/yaw separately so compound moves never introduce roll.
  return target.setFromEuler(facingAngles)
}

export class WorkspaceDrag {
  pointerId: number | null = null
  private offset = new Vector3()
  private radius = 0

  start(pointerId: number, point: Vector3, position: Vector3, eye: Vector3) {
    if (this.pointerId !== null || !point.toArray().every(Number.isFinite)) return false
    const radius = position.distanceTo(eye)
    if (!Number.isFinite(radius) || radius < 0.001) return false
    this.radius = radius
    this.pointerId = pointerId
    this.offset.copy(position).sub(point)
    return true
  }

  move(pointerId: number, point: Vector3, eye: Vector3, target: Vector3) {
    if (this.pointerId !== pointerId) return false
    target.copy(point).add(this.offset)
    return constrainWorkspacePosition(target, eye, this.radius)
  }

  end(pointerId: number) {
    if (this.pointerId !== pointerId) return false
    this.pointerId = null
    return true
  }
}
