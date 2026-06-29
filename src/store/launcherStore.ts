import { create } from "zustand";

import type { ComfyUIGeneratedImage }
from "../services/tauris";

export type GeneratedImageHistoryItem = {
  createdAt: number;
  id: string;
  image: ComfyUIGeneratedImage;
  modelName: string;
  prompt: string;
  promptId: string | null;
};

type LauncherState = {

  progress: number;
  status: string;
  logs: string[];
  chatImageModelName: string;
  imageGeneratorPrompt: string;
  imageGeneratorSelectedModelName: string;
  imageGeneratorPromptId: string | null;
  imageGeneratorIsGenerating: boolean;
  imageGeneratorGenerationLogStartIndex: number;
  imageGeneratorCurrentImageId: string | null;
  imageGeneratorImages: GeneratedImageHistoryItem[];

  setProgress: (value: number) => void;
  setStatus: (value: string) => void;
  addLog: (value: string) => void;
  clearLogs: () => void;
  setChatImageModelName: (value: string) => void;
  addGeneratedImage: (item: GeneratedImageHistoryItem) => void;
  setImageGeneratorPrompt: (value: string) => void;
  setImageGeneratorSelectedModelName: (value: string) => void;
  startImageGeneration: (logStartIndex: number) => void;
  finishImageGeneration: (item: GeneratedImageHistoryItem) => void;
  failImageGeneration: () => void;
  removeGeneratedImage: (id: string) => void;
};

const chatImageModelStorageKey =
  "assistia.chatImageModelName";

function readStoredChatImageModelName() {
  try {
    return localStorage.getItem(chatImageModelStorageKey) ?? "";
  } catch {
    return "";
  }
}

function storeChatImageModelName(value: string) {
  try {
    localStorage.setItem(chatImageModelStorageKey, value);
  } catch {
    // Storage can be unavailable in restricted webviews.
  }
}

export const useLauncherStore =
create<LauncherState>((set) => ({

  progress: 0,
  status: "Idle",
  logs: [],
  chatImageModelName: readStoredChatImageModelName(),
  imageGeneratorPrompt: "",
  imageGeneratorSelectedModelName: "",
  imageGeneratorPromptId: null,
  imageGeneratorIsGenerating: false,
  imageGeneratorGenerationLogStartIndex: 0,
  imageGeneratorCurrentImageId: null,
  imageGeneratorImages: [],

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

  setChatImageModelName: (value) => {
    storeChatImageModelName(value);
    set({ chatImageModelName: value });
  },

  addGeneratedImage: (item) =>
    set((state) => ({
      imageGeneratorCurrentImageId: item.id,
      imageGeneratorImages: [
        item,
        ...state.imageGeneratorImages
      ]
    })),

  setImageGeneratorPrompt: (value) =>
    set({ imageGeneratorPrompt: value }),

  setImageGeneratorSelectedModelName: (value) =>
    set({ imageGeneratorSelectedModelName: value }),

  startImageGeneration: (logStartIndex) =>
    set({
      imageGeneratorCurrentImageId: null,
      imageGeneratorGenerationLogStartIndex: logStartIndex,
      imageGeneratorIsGenerating: true,
      imageGeneratorPromptId: null
    }),

  finishImageGeneration: (item) =>
    set((state) => ({
      imageGeneratorCurrentImageId: item.id,
      imageGeneratorImages: [
        item,
        ...state.imageGeneratorImages
      ],
      imageGeneratorIsGenerating: false,
      imageGeneratorPromptId: item.promptId
    })),

  failImageGeneration: () =>
    set({
      imageGeneratorIsGenerating: false
    }),

  removeGeneratedImage: (id) =>
    set((state) => {
      const imageGeneratorImages =
        state.imageGeneratorImages.filter((item) => item.id !== id);

      return {
        imageGeneratorCurrentImageId:
          state.imageGeneratorCurrentImageId === id
            ? imageGeneratorImages[0]?.id ?? null
            : state.imageGeneratorCurrentImageId,
        imageGeneratorImages
      };
    }),
}));
