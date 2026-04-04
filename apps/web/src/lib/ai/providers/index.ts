import { AnthropicProvider } from "./anthropic";
import { GroqProvider } from "./groq";
import { DisabledAIProvider } from "./disabled";
import type { AIProvider } from "./base";

export function getAIProvider(): AIProvider {
  const aiDisabled = process.env.AI_DISABLED === "true";
  if (aiDisabled) {
    return new DisabledAIProvider();
  }

  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  try {
    switch (provider) {
      case "groq":
        return new GroqProvider();
      case "anthropic":
      default:
        return new AnthropicProvider();
    }
  } catch {
    return new DisabledAIProvider();
  }
}
