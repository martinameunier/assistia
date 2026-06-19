import { create } from "zustand";

type LauncherState = {

  progress: number;
  status: string;
  logs: string[];

  setProgress: (value: number) => void;
  setStatus: (value: string) => void;
  addLog: (value: string) => void;
  clearLogs: () => void;
};

export const useLauncherStore =
create<LauncherState>((set) => ({

  progress: 0,
  status: "Idle",
  logs: [],

  setProgress: (value) =>
    set({ progress: value }),

  setStatus: (value) =>
    set({ status: value }),

  addLog: (value) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-500),
        value
      ]
    })),

  clearLogs: () =>
    set({ logs: [] }),
}));
