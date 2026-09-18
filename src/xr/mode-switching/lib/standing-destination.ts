import { Box3, Matrix3, Object3D, Raycaster, Vector3 } from 'three'

export type StandingDestination = {
  point: Vector3
  source: 'aim' | 'fallback'
}

function visibleInHierarchy(object: Object3D) {
  for (
    let current: Object3D | null = object;
    current;
    current = current.parent
  ) {
    if (!current.visible) return false
  }
  return true
}

/** Query in life-size scene coordinates, not the scaled God-view coordinate frame.
 * The adapter must explicitly classify walkable surfaces. Never pass all scene meshes:
 * a horizontal tabletop or roof is not automatically an entry floor.
 * Obstacle bounds are deliberately conservative (false negatives are safe).
 */
export function findStandingDestination({
  aimOrigin,
  aimDirection,
  floors,
  obstacles,
  fallbacks = [],
  standingHeight = 1.8,
  radius = 0.25,
  maximumDistance = 100,
}: {
  aimOrigin: Vector3
  aimDirection: Vector3
  floors: readonly Object3D[]
  obstacles: readonly Object3D[]
  fallbacks?: readonly Vector3[]
  standingHeight?: number
  radius?: number
  maximumDistance?: number
}): StandingDestination | null {
  if (
    ![
      ...aimOrigin.toArray(),
      ...aimDirection.toArray(),
      standingHeight,
      radius,
      maximumDistance,
    ].every(Number.isFinite) ||
    aimDirection.lengthSq() < 1e-10 ||
    standingHeight <= 0 ||
    radius <= 0 ||
    maximumDistance <= 0
  )
    return null

  const floorObjects = floors.filter(visibleInHierarchy)
  const obstacleBounds = obstacles.filter(visibleInHierarchy).map((object) => {
    object.updateWorldMatrix(true, true)
    return new Box3().setFromObject(object, true)
  })
  for (const floor of floorObjects) floor.updateWorldMatrix(true, true)
  const ray = new Raycaster(
    aimOrigin,
    aimDirection.clone().normalize(),
    0,
    maximumDistance,
  )
  ray.layers.enableAll()
  const normalMatrix = new Matrix3()
  const normal = new Vector3()
  const down = new Vector3(0, -1, 0)
  const body = new Box3()

  function hasClearance(point: Vector3) {
    body.min.set(point.x - radius, point.y + 0.02, point.z - radius)
    body.max.set(
      point.x + radius,
      point.y + standingHeight + 0.1,
      point.z + radius,
    )
    if (obstacleBounds.some((bounds) => bounds.intersectsBox(body)))
      return false
    // Require support across the footprint, not just at its centre (ledge safety).
    for (const [x, z] of [
      [-radius, -radius],
      [-radius, radius],
      [radius, -radius],
      [radius, radius],
    ]) {
      ray.set(new Vector3(point.x + x!, point.y + 0.1, point.z + z!), down)
      ray.far = 0.2
      const support = ray
        .intersectObjects(floorObjects, false)
        .find((hit) => visibleInHierarchy(hit.object))
      if (!support || Math.abs(support.point.y - point.y) > 0.08) return false
    }
    return true
  }

  function firstFloor() {
    return ray.intersectObjects(floorObjects, false).find((hit) => {
      if (!hit.face || !visibleInHierarchy(hit.object)) return false
      normal
        .copy(hit.face.normal)
        .applyMatrix3(normalMatrix.getNormalMatrix(hit.object.matrixWorld))
        .normalize()
      return normal.y >= Math.cos(Math.PI / 6)
    })
  }

  const aimed = firstFloor()
  if (aimed && hasClearance(aimed.point))
    return { point: aimed.point.clone(), source: 'aim' }
  // Fallbacks are explicit spawn/last-safe hints; always revalidate their floor and clearance.
  for (const hint of fallbacks) {
    if (!hint.toArray().every(Number.isFinite)) continue
    ray.set(hint.clone().add(new Vector3(0, 0.2, 0)), down)
    ray.far = 0.4
    const floor = firstFloor()
    if (floor && hasClearance(floor.point))
      return { point: floor.point.clone(), source: 'fallback' }
  }
  return null
}

/** Compensate room-scale head offset after applying the desired arrival yaw. */
export function standingOriginPose(
  point: Vector3,
  viewerPosition: Vector3,
  viewerYaw: number,
  arrivalYaw: number,
) {
  const yaw = arrivalYaw - viewerYaw
  const offset = viewerPosition
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), yaw)
  return {
    position: new Vector3(point.x - offset.x, point.y, point.z - offset.z),
    yaw,
  }
}
