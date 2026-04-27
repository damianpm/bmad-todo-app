import type { APIRequestContext } from "@playwright/test";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";

export async function clearTodos(api: APIRequestContext): Promise<void> {
  const res = await api.get(`${API_BASE_URL}/todos`);
  if (!res.ok()) throw new Error(`failed to list todos: ${res.status()}`);
  const todos = (await res.json()) as Array<{ id: string }>;
  await Promise.all(todos.map((t) => api.delete(`${API_BASE_URL}/todos/${t.id}`)));
}
