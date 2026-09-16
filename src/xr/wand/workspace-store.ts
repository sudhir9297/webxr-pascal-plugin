import { create } from 'zustand'

export const useXRWorkspace = create<{
  resetPositionRequest: number
  resetPanelPosition: () => void
  recallRequest: number
  recallReason: 'manual' | 'selection'
  recall: (reason?: 'manual' | 'selection') => void
}>((set) => ({
  resetPositionRequest: 0,
  resetPanelPosition: () => set((state) => ({
    resetPositionRequest: state.resetPositionRequest + 1,
  })),
  recallRequest: 0,
  recallReason: 'manual',
  recall: (reason = 'manual') => set((state) => ({
    recallRequest: state.recallRequest + 1,
    recallReason: reason,
  })),
}))
