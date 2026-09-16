import { expect, test } from 'bun:test'
import { useXRWorkspace } from './workspace-store'

test('selection and recenter do not request an offset reset', () => {
  const initial = useXRWorkspace.getState()
  try {
    initial.recall('selection')
    expect(useXRWorkspace.getState().resetPositionRequest).toBe(initial.resetPositionRequest)
    useXRWorkspace.getState().recall()
    expect(useXRWorkspace.getState().resetPositionRequest).toBe(initial.resetPositionRequest)
    expect(useXRWorkspace.getState().recallRequest).toBe(initial.recallRequest + 2)
    useXRWorkspace.getState().resetPanelPosition()
    expect(useXRWorkspace.getState().resetPositionRequest).toBe(initial.resetPositionRequest + 1)
    expect(useXRWorkspace.getState().recallReason).toBe('manual')
    expect(useXRWorkspace.getState().recallRequest).toBe(initial.recallRequest + 2)
  } finally {
    useXRWorkspace.setState(initial, true)
  }
})

test('resetting the panel offset preserves a pending selection recall', () => {
  const initial = useXRWorkspace.getState()
  try {
    initial.recall('selection')
    const beforeReset = useXRWorkspace.getState()
    beforeReset.resetPanelPosition()
    expect(useXRWorkspace.getState().recallRequest).toBe(beforeReset.recallRequest)
    expect(useXRWorkspace.getState().recallReason).toBe('selection')
    expect(useXRWorkspace.getState().resetPositionRequest).toBe(beforeReset.resetPositionRequest + 1)
  } finally {
    useXRWorkspace.setState(initial, true)
  }
})
