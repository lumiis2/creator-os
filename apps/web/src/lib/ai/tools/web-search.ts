const TAVILY_ENDPOINT = "https://api.tavily.com/search";

interface TavilyResult {
  title?: string;
  content?: string;
  score?: number;
  url?: string;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

function sanitizeSentence(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export async function runWebSearch(query: string): Promise<string | null> {
  const enabled = process.env.WEB_SEARCH_ENABLED === "true";
  const apiKey = process.env.WEB_SEARCH_API_KEY;

  if (!enabled || !apiKey || !query.trim()) {
    return null;
  }

  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as TavilyResponse;
    const answer = payload.answer ? sanitizeSentence(payload.answer) : null;
    const results = (payload.results ?? [])
      .filter((item) => typeof item.content === "string" && item.content.trim().length > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3)
      .map((item, index) => {
        const title = sanitizeSentence(item.title ?? `Result ${index + 1}`);
        const insight = sanitizeSentence(item.content ?? "").slice(0, 240);
        return `${index + 1}. ${title}: ${insight}`;
      });

    if (!answer && !results.length) {
      return null;
    }

    return [
      "=== Web Search Insights ===",
      answer ? `summary: ${answer}` : null,
      results.length ? "key_findings:" : null,
      ...results,
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return null;
  }
}
