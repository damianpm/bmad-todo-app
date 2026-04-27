import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { App } from "./App.js";
import { renderWithClient, makeTodo } from "./test-utils.js";
import * as api from "./api/client.js";

vi.mock("./api/client.js", async () => {
  const actual = await vi.importActual<typeof import("./api/client.js")>("./api/client.js");
  return {
    ...actual,
    listTodos: vi.fn(),
    createTodo: vi.fn(),
    toggleTodo: vi.fn(),
    deleteTodo: vi.fn(),
  };
});

const listTodosMock = vi.mocked(api.listTodos);

describe("App", () => {
  beforeEach(() => {
    listTodosMock.mockReset();
  });

  it("shows the loading state while fetching", async () => {
    listTodosMock.mockImplementation(() => new Promise(() => {}));
    renderWithClient(<App />);
    expect(await screen.findByText(/Loading todos/i)).toBeInTheDocument();
  });

  it("shows the empty state when there are no todos", async () => {
    listTodosMock.mockResolvedValue([]);
    renderWithClient(<App />);
    expect(await screen.findByText(/Nothing here yet/i)).toBeInTheDocument();
  });

  it("renders todos when present", async () => {
    listTodosMock.mockResolvedValue([
      makeTodo({ id: "a", text: "first" }),
      makeTodo({ id: "b", text: "second" }),
    ]);
    renderWithClient(<App />);
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());
    expect(screen.getByText("second")).toBeInTheDocument();
  });

  it("shows the error state when the request fails", async () => {
    listTodosMock.mockRejectedValue(new Error("api unreachable"));
    renderWithClient(<App />);
    expect(await screen.findByText(/Couldn't load/i)).toBeInTheDocument();
    expect(screen.getByText("api unreachable")).toBeInTheDocument();
  });
});
