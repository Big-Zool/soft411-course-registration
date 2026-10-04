// The accessibility check. Test ID (TC-xx) matches the test case table in docs/REPORT.md.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("TC-12 the page has no automatically detectable WCAG 2.2 A/AA violations", async ({ request, page }) => {
  await request.post("/api/test/reset");
  await page.goto("/");
  await page.getByLabel("Student ID").fill("S100002");
  await page.getByRole("button", { name: "Load schedule" }).click();
  await expect(page.locator("#schedule li")).toHaveCount(5);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
