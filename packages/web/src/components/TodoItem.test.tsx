import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoItem } from "./TodoItem.js";
import { renderWithClient, makeTodo } from "../test-utils.js";
import * as api from "../api/client.js";

vi.mock("../api/client.js", async () => {
  const actual = await vi.importActual<typeof import("../api/client.js")>("../api/client.js");
  return {
    ...actual,
    toggleTodo: vi.fn(),
    deleteTodo: vi.fn(),
  };
});

const toggleTodoMock = vi.mocked(api.toggleTodo);
const deleteTodoMock = vi.mocked(api.deleteTodo);

describe("TodoItem", () => {
  beforeEach(() => {
    toggleTodoMock.mockReset();
    deleteTodoMock.mockReset();
  });

  it("renders the todo text", () => {
    renderWithClient(<TodoItem todo={makeTodo({ text: "buy milk" })} />);
    expect(screen.getByText("buy milk")).toBeInTheDocument();
  });

  it("applies the completed modifier when the todo is done", () => {
    const { container } = renderWithClient(<TodoItem todo={makeTodo({ completed: true })} />);
    expect(container.querySelector(".todo-item--completed")).toBeTruthy();
  });

  it("calls toggleTodo when the checkbox is clicked", async () => {
    toggleTodoMock.mockResolvedValue(makeTodo({ completed: true }));
    renderWithClient(<TodoItem todo={makeTodo({ completed: false })} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(toggleTodoMock).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        true,
      ),
    );
  });

  it("calls deleteTodo when the delete button is clicked", async () => {
    deleteTodoMock.mockResolvedValue(undefined);
    renderWithClient(<TodoItem todo={makeTodo()} />);
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() =>
      expect(deleteTodoMock).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111"),
    );
  });
});
