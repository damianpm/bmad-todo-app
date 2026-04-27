import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingState } from "./LoadingState.js";

describe("LoadingState", () => {
  it("announces loading via role status", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Loading todos/i)).toBeInTheDocument();
  });
});
