import {
  TodoListSchema,
  TodoSchema,
  type Todo,
  type CreateTodoInput,
  ApiErrorSchema,
} from "@bmad-todo/shared";

function resolveBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (v) return v;
  if (import.meta.env.PROD) {
    throw new Error(
      "VITE_API_BASE_URL must be set at build time for production builds",
    );
  }
  return "http://localhost:3000";
}

const BASE_URL = resolveBaseUrl();

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errorToken: string;
  constructor(status: number, errorToken: string, code: string, message: string) {
    super(message);
    this.status = status;
    this.errorToken = errorToken;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  parse: (data: unknown) => T,
): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (init.body !== undefined && init.body !== null) {
    headers["Content-Type"] = "application/json";
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, signal: ctrl.signal });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const parsed = ApiErrorSchema.safeParse(errBody);
      if (parsed.success) {
        throw new ApiClientError(res.status, parsed.data.error, parsed.data.code, parsed.data.message);
      }
      throw new ApiClientError(res.status, "unknown_error", "client.unknown", `HTTP ${res.status}`);
    }
    if (res.status === 204) return parse(undefined);
    const data = await res.json();
    return parse(data);
  } finally {
    clearTimeout(timer);
  }
}

export async function listTodos(): Promise<Todo[]> {
  return request("/todos", { method: "GET" }, (data) => TodoListSchema.parse(data));
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  return request(
    "/todos",
    { method: "POST", body: JSON.stringify(input) },
    (data) => TodoSchema.parse(data),
  );
}

export async function toggleTodo(id: string, completed: boolean): Promise<Todo> {
  return request(
    `/todos/${id}`,
    { method: "PATCH", body: JSON.stringify({ completed }) },
    (data) => TodoSchema.parse(data),
  );
}

export async function deleteTodo(id: string): Promise<void> {
  await request(`/todos/${id}`, { method: "DELETE" }, () => undefined);
}
