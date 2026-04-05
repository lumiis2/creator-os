export type WorkspaceSaveStage = "idea" | "draft" | "script";

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[#>*\-\d.\s]+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildWorkspaceTitleFromMessage(content: string): string {
  const rawLines = content
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line))
    .filter(Boolean);

  const firstLine = rawLines[0] ?? "";
  const sentence = firstLine.split(/(?<=[.!?])\s+/)[0] ?? firstLine;
  const title = sentence.trim();

  if (!title) return "Saved assistant note";
  return title.length > 120 ? `${title.slice(0, 117).trim()}...` : title;
}

export async function saveAssistantMessageToWorkspace(content: string, stage: WorkspaceSaveStage) {
  const payload = {
    title: buildWorkspaceTitleFromMessage(content),
    body: content,
    stage,
  };

  const res = await fetch("/api/workspace/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? "Failed to save message to workspace";
    throw new Error(message);
  }

  return res.json();
}
