import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState.js";

describe("EmptyState", () => {
  it("renders empty title and hint", () => {
    render(<EmptyState />);
    expect(screen.getByText(/Nothing here yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Add your first task/i)).toBeInTheDocument();
  });

  it("has role status for assistive tech", () => {
    render(<EmptyState />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
