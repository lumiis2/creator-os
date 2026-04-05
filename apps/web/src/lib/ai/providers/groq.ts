import OpenAI from "openai";
import type { AIProvider, ChatMessage, StreamChunk } from "./base";

const MODEL = process.env.GROQ_MODEL ?? "mixtral-8x7b-32768";

export class GroqProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is required");
    this.client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  }

  async *streamChat(input: { systemPrompt: string; messages: ChatMessage[]; maxTokens?: number }): AsyncIterable<StreamChunk> {
    const messages = [
      { role: "system" as const, content: input.systemPrompt },
      ...input.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const stream = await this.client.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: input.maxTokens ?? 1000,
      temperature: 0.3,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (typeof delta === "string") {
        yield { text: delta };
      }
    }
  }
}
