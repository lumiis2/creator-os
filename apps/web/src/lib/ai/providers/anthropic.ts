import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ChatMessage, StreamChunk } from "./base";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
    this.client = new Anthropic({ apiKey });
  }

  async *streamChat(input: { systemPrompt: string; messages: ChatMessage[]; maxTokens?: number }): AsyncIterable<StreamChunk> {
    const messages: Anthropic.MessageParam[] = input.messages
      .filter((m): m is ChatMessage & { role: "user" | "assistant" } => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const stream = await this.client.messages.stream({
      model: MODEL,
      system: input.systemPrompt,
      messages,
      max_tokens: input.maxTokens ?? 1000,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { text: event.delta.text };
      }
    }
  }
}
