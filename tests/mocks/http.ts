import { vi } from "vitest";

export function mockFetchJsonOnce(payload: unknown, status = 200) {
  return vi.spyOn(global, "fetch").mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response);
}

export function mockFetchSequence(items: Array<{ payload: unknown; status?: number }>) {
  const spy = vi.spyOn(global, "fetch");
  for (const item of items) {
    const status = item.status ?? 200;
    spy.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => item.payload,
      text: async () => JSON.stringify(item.payload),
    } as unknown as Response);
  }
  return spy;
}
