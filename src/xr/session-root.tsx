'use client'

import { advance, useStore, useThree } from '@react-three/fiber'
import { XR, XROrigin, type XRStore } from '@react-three/xr'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import {
  advanceXRFrameWithoutDesktopRender,
  ownsXRFrameLoopBinding,
  renderImmersiveXRFrame,
  stopXRFrameLoop,
  takeOverXRFrameLoop,
  type XRFrameLoopRenderer,
} from './frame-loop'

function configureWebGLXRBaseLayer(manager: { [key: string]: unknown }) {
  // Three prefers XRProjectionLayer whenever a partial XRWebGLBinding exists.
  // IWER exposes that binding but drives input frames from XRWebGLLayer, so
  // projection-layer selection leaves the session without a base layer.
  if ('_supportsLayers' in manager) manager._supportsLayers = false
}

export const WEBXR_CAMERA_NEAR = 0.001
export const WEBXR_CAMERA_FAR = 10_000

function applyWebXRCameraClipping(camera: {
  far: number
  near: number
  updateProjectionMatrix(): void
}) {
  camera.far = WEBXR_CAMERA_FAR
  camera.near = WEBXR_CAMERA_NEAR
  camera.updateProjectionMatrix()
}

function XRSessionBinding({ session, store }: { session?: XRSession; store: XRStore }) {
  const renderer = useThree((state) => state.gl)
  const r3fXR = useThree((state) => state.xr)
  const rootStore = useStore()
  const activeBinding = useRef<symbol | null>(null)

  useEffect(() => {
    const manager = renderer.xr
    if (!session) return

    let cancelled = false
    let restoreFrameLoop: (() => void) | undefined
    let resyncInputsOnNextFrame = false
    const binding = Symbol('xr-session-binding')
    activeBinding.current = binding
    const state = rootStore.getState()
    const baseCamera = state.camera

    const attachSession = async () => {
      // Attach the session before starting the renderer-owned loop. IWER
      // publishes input sources on its first frame; starting the loop first
      // can race @react-three/xr's session synchronization and leave the
      // store with a session but no controllers or hands.
      r3fXR?.disconnect()
      configureWebGLXRBaseLayer(manager as unknown as { [key: string]: unknown })
      const restore = await takeOverXRFrameLoop(
        renderer as unknown as XRFrameLoopRenderer,
        r3fXR,
        (time, frame) => {
          if (!frame) return
          if (resyncInputsOnNextFrame) {
            resyncInputsOnNextFrame = false
            const xrState = store.getState()
            if (
              xrState.session !== session ||
              (xrState.inputSourceStates.length === 0 && session.inputSources.length > 0)
            ) {
              // IWER publishes its initial controllers on the first immersive
              // frame. Rebinding here lets the XR store consume the current
              // session.inputSources even when that first change event raced
              // the renderer's sessionstart event.
              manager.dispatchEvent({ type: 'sessionstart' })
            }
          }
          const frameState = rootStore.getState()
          advanceXRFrameWithoutDesktopRender(frameState, () => {
            advance(time, true, frameState, frame)
          })
          renderImmersiveXRFrame(renderer, frameState.scene, baseCamera)
        },
        {
          dpr: state.viewport.dpr,
          height: state.size.height,
          width: state.size.width,
        },
      )
      restoreFrameLoop = restore
      if (cancelled) {
        // React Strict Mode can begin the replacement binding before this
        // async setup settles. Only restore when this cancelled setup still
        // owns the renderer; otherwise it would erase the newer frame loop.
        if (ownsXRFrameLoopBinding(activeBinding.current, binding)) restore()
        return
      }

      if (manager.getSession() !== session) await manager.setSession(session)
      session.addEventListener(
        'end',
        () => stopXRFrameLoop(renderer as unknown as XRFrameLoopRenderer),
        { once: true },
      )
      applyWebXRCameraClipping(manager.getCamera())
      session.updateRenderState({
        baseLayer: manager.getBaseLayer() as XRWebGLLayer | undefined,
        depthFar: WEBXR_CAMERA_FAR,
        depthNear: WEBXR_CAMERA_NEAR,
      })

      // The WebGPU renderer's WebGL backend can omit Three's sessionstart event,
      // which leaves @react-three/xr unaware of controllers and hands.
      if (store.getState().session !== session) {
        manager.dispatchEvent({ type: 'sessionstart' })
      }
      resyncInputsOnNextFrame = true

      if (cancelled) {
        restore()
        return
      }
    }

    void attachSession().catch((error: unknown) => {
      console.error('[webxr-plugin] Could not attach the WebXR session', error)
      void session.end().catch(() => undefined)
    })

    return () => {
      cancelled = true
      if (ownsXRFrameLoopBinding(activeBinding.current, binding)) restoreFrameLoop?.()
    }
  }, [renderer, r3fXR, rootStore, session, store])

  return null
}

export type WebXRSessionRootProps = {
  children: ReactNode
  originPosition?: [number, number, number]
  session?: XRSession
  store: XRStore
}

export function WebXRSessionRoot({
  children,
  originPosition,
  session,
  store,
}: WebXRSessionRootProps) {
  return (
    <XR store={store}>
      <XROrigin position={originPosition} />
      <XRSessionBinding session={session} store={store} />
      {children}
    </XR>
  )
}
