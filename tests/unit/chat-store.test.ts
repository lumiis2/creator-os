import { describe, expect, it } from "vitest";
import { useChatUiStore } from "../../apps/web/src/stores/chat";

describe("chat ui store", () => {
  it("updates active session and draft deterministically", () => {
    useChatUiStore.setState({ activeSessionId: null, draft: "" });

    useChatUiStore.getState().setActiveSessionId("session-1");
    useChatUiStore.getState().setDraft("hello");

    const state = useChatUiStore.getState();
    expect(state.activeSessionId).toBe("session-1");
    expect(state.draft).toBe("hello");
  });
});
