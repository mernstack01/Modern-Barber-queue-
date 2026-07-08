"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  setCommandOpen: (value: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandOpen: false,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setCommandOpen: (value) => set({ commandOpen: value })
    }),
    { name: "barber-ui-store", partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }) }
  )
);
