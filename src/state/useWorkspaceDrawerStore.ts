import { create } from "zustand";

type WorkspaceDrawerState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openWorkspace: () => void;
  closeWorkspace: () => void;
};

export const useWorkspaceDrawerStore = create<WorkspaceDrawerState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  openWorkspace: () => set({ open: true }),
  closeWorkspace: () => set({ open: false }),
}));
