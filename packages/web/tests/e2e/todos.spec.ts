import { test, expect } from "@playwright/test";
import { clearTodos } from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await clearTodos(request);
});

test("shows the empty state on first load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Nothing here yet/i)).toBeVisible();
  await expect(page.getByLabel(/new todo/i)).toBeVisible();
});

test("creates a todo and shows it at the top of the list", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/new todo/i).fill("buy milk");
  await page.getByRole("button", { name: /add/i }).click();

  const list = page.getByRole("list", { name: /todos/i });
  await expect(list.getByText("buy milk")).toBeVisible();
  await expect(page.getByLabel(/new todo/i)).toHaveValue("");
});

test("toggles a todo to completed and back", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/new todo/i).fill("walk the dog");
  await page.getByRole("button", { name: /add/i }).click();

  const checkbox = page.getByRole("checkbox", { name: /walk the dog/i });
  await expect(checkbox).toBeVisible();
  await expect(checkbox).not.toBeChecked();

  await checkbox.click();
  // Visible state: the parent <li> gains the completed modifier class
  await expect(page.locator("li.todo-item--completed")).toContainText("walk the dog");
  await expect(checkbox).toBeChecked();

  // Toggle back
  await checkbox.click();
  await expect(page.locator("li.todo-item--completed")).toHaveCount(0);
  await expect(checkbox).not.toBeChecked();
});

test("deletes a todo and shows the empty state again", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/new todo/i).fill("delete me");
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText("delete me")).toBeVisible();

  await page.getByRole("button", { name: /delete "delete me"/i }).click();
  await expect(page.getByText("delete me")).toHaveCount(0);
  await expect(page.getByText(/Nothing here yet/i)).toBeVisible({ timeout: 10_000 });
});

test("shows an error state when the API is unreachable", async ({ page }) => {
  await page.route("**/todos", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText(/Couldn't load/i)).toBeVisible();
});

test("orders todos newest first", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/new todo/i).fill("first");
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText("first")).toBeVisible();

  await page.getByLabel(/new todo/i).fill("second");
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText("second")).toBeVisible();

  const items = page.getByRole("listitem");
  await expect(items.nth(0)).toContainText("second");
  await expect(items.nth(1)).toContainText("first");
});
