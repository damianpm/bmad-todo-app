import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { clearTodos } from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await clearTodos(request);
});

test("empty state has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Nothing here yet/i)).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(
    critical,
    `critical a11y violations:\n${JSON.stringify(critical, null, 2)}`,
  ).toEqual([]);
});

test("populated list has no critical accessibility violations", async ({ page, request }) => {
  await request.post("http://localhost:3000/todos", { data: { text: "first thing" } });
  await request.post("http://localhost:3000/todos", { data: { text: "second thing" } });

  await page.goto("/");
  await expect(page.getByText("first thing")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(
    critical,
    `critical a11y violations:\n${JSON.stringify(critical, null, 2)}`,
  ).toEqual([]);
});
