import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function renderWithClient(ui: ReactElement, options?: RenderOptions) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export function makeTodo(overrides: Partial<{ id: string; text: string; completed: boolean; createdAt: string }> = {}) {
  return {
    id: overrides.id ?? "11111111-1111-1111-1111-111111111111",
    text: overrides.text ?? "buy milk",
    completed: overrides.completed ?? false,
    createdAt: overrides.createdAt ?? "2026-04-27T10:00:00.000Z",
  };
}
