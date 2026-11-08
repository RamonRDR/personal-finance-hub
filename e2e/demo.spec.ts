import { expect, test } from "@playwright/test";
test("demo renders and allows a synthetic expense", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Visão geral das finanças" })).toBeVisible();
  await expect(page.getByText("MODO DEMONSTRAÇÃO")).toBeVisible();
  await page.getByRole("button", { name: "Nova despesa" }).click();
  await page.getByPlaceholder("Ex.: Mercado Exemplo").fill("Compra fictícia de teste");
  await page.getByPlaceholder("89,90").fill("89,90");
  await page.getByRole("button", { name: "Adicionar na demo" }).click();
  await expect(page.getByText("Compra fictícia de teste")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Não foi salva no Google Sheets");
});
test("health and manifest are accessible", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe("ok");
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
});
