'use client'

import { useScene } from '@pascal-app/core'
import {
  createXRStore,
  DefaultXRController,
  DefaultXRHand,
  type XRStore,
} from '@react-three/xr'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

export const WEBXR_PLUGIN_ID = 'webxr:core'

type RuntimeSource = 'native' | 'emulated'
type RuntimeStatus = 'idle' | 'entering' | 'active' | 'error'

type EmulatedDevice = {
  canvasContainer: HTMLDivElement
  devui?: {
    devUICanvas: HTMLCanvasElement
    devUIContainer: HTMLDivElement
  }
}

type RuntimeGlobal = typeof globalThis & {
  __webXRPluginDevice?: EmulatedDevice
  __webXRPluginSetup?: Promise<RuntimeSource>
}

export type WebXRFeature = {
  enabled: boolean
  enter: () => Promise<void>
  error: string | null
  exit: () => Promise<void>
  inputSources: readonly string[]
  status: RuntimeStatus
  xr?: WebXRViewerConfig
}

export type WebXRViewerConfig = {
  multiview: false
  originPosition: [number, number, number]
  playerModes: false
  session: XRSession
  store: XRStore
}

// IWER and native headsets already supply the tracked standing eye height.
// Offset only along the floor plane so the user starts outside the model and
// looks toward its centre instead of being lifted above the walls.
export const WEBXR_ORIGIN_POSITION: [number, number, number] = [0, 0, 8]
export type WebXRStoreFactory = () => XRStore

function createDefaultWebXRStore(): XRStore {
  return createXRStore({
    controller: DefaultXRController,
    hand: DefaultXRHand,
    layers: false,
    offerSession: false,
  })
}

export function resolveRuntimeSource({
  development,
  nativeSupported,
}: {
  development: boolean
  nativeSupported: boolean
}): RuntimeSource | 'unsupported' {
  if (nativeSupported) return 'native'
  return development ? 'emulated' : 'unsupported'
}

async function supportsImmersiveVR(): Promise<boolean> {
  try {
    return (await navigator.xr?.isSessionSupported('immersive-vr')) ?? false
  } catch {
    return false
  }
}

async function prepareRuntime(): Promise<RuntimeSource> {
  const runtimeGlobal = globalThis as RuntimeGlobal
  runtimeGlobal.__webXRPluginSetup ??= (async () => {
    const nativeSupported = await supportsImmersiveVR()
    const source = resolveRuntimeSource({
      development: process.env.NODE_ENV !== 'production',
      nativeSupported,
    })
    if (source === 'native') return source
    if (source === 'unsupported') {
      throw new Error('Immersive VR is unavailable. Connect a headset and enable WebXR.')
    }

    const [{ XRDevice, metaQuest3 }, { DevUI }] = await Promise.all([
      import('iwer'),
      import('@iwer/devui'),
    ])
    const device = new XRDevice(metaQuest3)
    device.installRuntime({ forceInstall: true })
    device.installDevUI(DevUI)
    runtimeGlobal.__webXRPluginDevice = device

    if (!(await supportsImmersiveVR())) {
      throw new Error('The Quest 3 emulator could not provide an immersive VR session.')
    }
    return 'emulated'
  })().catch((error: unknown) => {
    delete runtimeGlobal.__webXRPluginSetup
    throw error
  })
  return runtimeGlobal.__webXRPluginSetup
}

function mountEmulatorControls(): () => void {
  const device = (globalThis as RuntimeGlobal).__webXRPluginDevice
  const devui = device?.devui
  if (!(device && devui)) return () => undefined

  const host = device.canvasContainer
  if (!devui.devUICanvas.isConnected) host.appendChild(devui.devUICanvas)
  if (!devui.devUIContainer.isConnected) host.appendChild(devui.devUIContainer)
  if (!host.isConnected) document.body.appendChild(host)

  return () => {
    if (devui.devUICanvas.parentElement === host) devui.devUICanvas.remove()
    if (devui.devUIContainer.parentElement === host) devui.devUIContainer.remove()
    if (host.isConnected && host.childElementCount === 0) host.remove()
  }
}

export function useWebXRFeature(createStore: WebXRStoreFactory = createDefaultWebXRStore): WebXRFeature {
  const enabled = useScene((state) =>
    ((state as typeof state & { installedPlugins?: string[] }).installedPlugins ?? []).includes(
      WEBXR_PLUGIN_ID,
    ),
  )
  // The viewer owns creation of its XR store. This keeps the store, controller,
  // hand implementations and <XR> provider on the same @react-three/xr module
  // instance when the plugin is linked from a separate package directory.
  const [store] = useState<XRStore>(createStore)
  const [session, setSession] = useState<XRSession>()
  const [source, setSource] = useState<RuntimeSource>()
  const [status, setStatus] = useState<RuntimeStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const inputSourceStates = useSyncExternalStore(
    store.subscribe,
    () => store.getState().inputSourceStates,
    () => store.getState().inputSourceStates,
  )
  const inputSources = useMemo(
    () =>
      inputSourceStates.map(
        (state) => `${state.type}:${state.inputSource.handedness || 'none'}`,
      ),
    [inputSourceStates],
  )

  useEffect(() => {
    if (!(session && source === 'emulated')) return
    return mountEmulatorControls()
  }, [session, source])

  useEffect(() => {
    if (!session) return
    const ended = () => {
      setSession(undefined)
      setStatus('idle')
    }
    session.addEventListener('end', ended, { once: true })
    return () => session.removeEventListener('end', ended)
  }, [session])

  useEffect(() => {
    if (enabled || !session) return
    void session.end()
  }, [enabled, session])

  const enter = useCallback(async () => {
    if (!(enabled && status !== 'entering')) return
    if (session) return
    setStatus('entering')
    setError(null)
    try {
      const runtimeSource = await prepareRuntime()
      const xrSystem = navigator.xr
      if (!xrSystem) throw new Error('This browser does not expose WebXR.')
      const nextSession = await xrSystem.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['anchors', 'hand-tracking', 'hit-test'],
      })
      setSource(runtimeSource)
      setSession(nextSession)
      setStatus('active')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Could not enter immersive VR.')
    }
  }, [enabled, session, status])

  const exit = useCallback(async () => {
    if (session) await session.end()
  }, [session])

  const xr = useMemo<WebXRViewerConfig | undefined>(
    () =>
      session
        ? {
            multiview: false,
            originPosition: WEBXR_ORIGIN_POSITION,
            playerModes: false,
            session,
            store,
          }
        : undefined,
    [session, store],
  )

  return { enabled, enter, error, exit, inputSources, status, xr }
}
