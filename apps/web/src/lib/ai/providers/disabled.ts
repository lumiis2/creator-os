import type { AIProvider, ChatMessage, StreamChunk } from "./base";

export class DisabledAIProvider implements AIProvider {
  async *streamChat(_input: { systemPrompt: string; messages: ChatMessage[]; maxTokens?: number }): AsyncIterable<StreamChunk> {
    yield {
      text: "AI chat is currently disabled in this environment. You can keep using dashboard, profile, workspace, and analytics.",
    };
  }
}
