import { expect, test, type Page } from "@playwright/test";

async function openSection(page: Page, name: string) {
  const mobileMenu = page.getByRole("button", { name: "Abrir menu" });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("button", { name, exact: true })
    .click();
}

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

test("simulated payment stays local and calendar remains a dry run", async ({ page }) => {
  await page.goto("/");
  await openSection(page, "Contas");
  await expect(page.getByRole("heading", { name: "Contas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Marcar paga (demo)" }).first().click();
  await expect(page.getByRole("status")).toContainText("Nenhuma alteração foi enviada");
  await openSection(page, "Calendário");
  await expect(page.getByRole("heading", { name: "Pré-visualização do calendário" })).toBeVisible();
  await expect(page.getByText("Integração desativada")).toBeVisible();
});

test("budget limits are changeable only within the demonstration", async ({ page }) => {
  await page.goto("/");
  await openSection(page, "Orçamentos");
  await expect(page.getByRole("heading", { name: "Limites por categoria" })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Orçamento Casa" });
  await input.fill("700,00");
  await input.press("Tab");
  await expect(page.getByRole("status")).toContainText("Orçamento da demonstração");
});

test("health, manifest and synthetic API are cache-safe", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe("ok");
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const manifestData = await manifest.json();
  expect(manifestData.display).toBe("standalone");
  expect(manifestData.icons).toHaveLength(2);
  const demo = await request.get("/api/demo");
  expect(demo.ok()).toBeTruthy();
  expect(demo.headers()["cache-control"]).toContain("no-store");
  expect(demo.headers()["x-demo-data"]).toBe("synthetic");
  expect((await demo.json()).mode).toBe("demo");
});

test("private Google endpoints are disabled without server credentials", async ({ request }) => {
  const session = await request.get("/api/auth/session");
  expect(session.ok()).toBeTruthy();
  expect(await session.json()).toEqual({ configured: false, connected: false });
  const snapshot = await request.get("/api/finance/snapshot");
  expect(snapshot.status()).toBe(404);
  const oauth = await request.get("/api/auth/google/start", { maxRedirects: 0 });
  expect(oauth.status()).toBe(404);
});
