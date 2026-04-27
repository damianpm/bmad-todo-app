import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddTodoForm } from "./AddTodoForm.js";
import { renderWithClient, makeTodo } from "../test-utils.js";
import * as api from "../api/client.js";

vi.mock("../api/client.js", async () => {
  const actual = await vi.importActual<typeof import("../api/client.js")>("../api/client.js");
  return {
    ...actual,
    createTodo: vi.fn(),
  };
});

const createTodoMock = vi.mocked(api.createTodo);

describe("AddTodoForm", () => {
  beforeEach(() => {
    createTodoMock.mockReset();
  });

  it("disables the submit button when input is empty", () => {
    renderWithClient(<AddTodoForm />);
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });

  it("submits a trimmed value and clears the input", async () => {
    createTodoMock.mockResolvedValue(makeTodo({ text: "buy milk" }));
    renderWithClient(<AddTodoForm />);
    const input = screen.getByLabelText(/new todo/i);
    await userEvent.type(input, "  buy milk  ");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(createTodoMock).toHaveBeenCalledWith({ text: "buy milk" }));
    expect(input).toHaveValue("");
  });

  it("shows an inline error when the API fails", async () => {
    createTodoMock.mockRejectedValue(new Error("network is down"));
    renderWithClient(<AddTodoForm />);
    await userEvent.type(screen.getByLabelText(/new todo/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network is down/i));
  });

  it("does not call the API for whitespace-only input", async () => {
    renderWithClient(<AddTodoForm />);
    const input = screen.getByLabelText(/new todo/i);
    // type a space, button stays disabled, but force submit via Enter
    await userEvent.type(input, "   {Enter}");
    expect(createTodoMock).not.toHaveBeenCalled();
  });
});
