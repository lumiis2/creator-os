export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface StreamChunk {
  text: string;
}

export interface AIProvider {
  streamChat(input: {
    systemPrompt: string;
    messages: ChatMessage[];
    maxTokens?: number;
  }): AsyncIterable<StreamChunk>;
}
