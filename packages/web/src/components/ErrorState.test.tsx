import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./ErrorState.js";

describe("ErrorState", () => {
  it("renders the error title and is announced as alert", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Couldn't load/i)).toBeInTheDocument();
  });

  it("shows the message when provided", () => {
    render(<ErrorState message="boom" />);
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("calls onRetry when the button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("hides the retry button when no onRetry is provided", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });
});
