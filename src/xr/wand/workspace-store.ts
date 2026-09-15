import { create } from 'zustand'

export const useXRWorkspace = create<{
  recallRequest: number
  recall: () => void
}>((set) => ({
  recallRequest: 0,
  recall: () => set((state) => ({ recallRequest: state.recallRequest + 1 })),
}))
