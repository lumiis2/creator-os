import { create } from "zustand";

interface ChatUiState {
  activeSessionId: string | null;
  draft: string;
  setActiveSessionId: (id: string | null) => void;
  setDraft: (value: string) => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  activeSessionId: null,
  draft: "",
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setDraft: (value) => set({ draft: value }),
}));
