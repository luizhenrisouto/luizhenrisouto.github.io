import { test, expect } from "@playwright/test";

test("seções na ordem aprovada", async ({ page }) => {
  await page.goto("/");
  const ids = await page.locator("main > section").evaluateAll((s) => s.map((e) => e.id));
  expect(ids).toEqual(["topo", "projetos", "como-testo", "trajetoria", "ferramentas", "contato"]);
});

test("pipeline do topo tem 5 etapas e termina no impacto", async ({ page }) => {
  await page.goto("/");
  const etapas = page.locator("#topo .pipeline > .etapa");
  await expect(etapas).toHaveCount(5);
  await expect(etapas.last()).toHaveClass(/etapa--impacto/);
});

test("sem rolagem horizontal em 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largura).toBeLessThanOrEqual(360);
});

test("movimento reduzido mostra tudo aceso", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const estilos = await page
    .locator(".etapa")
    .evaluateAll((es) => es.map((e) => ({ o: getComputedStyle(e).opacity, a: getComputedStyle(e).animationName })));
  expect(estilos.length).toBeGreaterThan(5);
  for (const s of estilos) expect(s).toEqual({ o: "1", a: "none" });
});

test("cartão da Mater sem demo nem código", async ({ page }) => {
  await page.goto("/");
  const cartao = page.locator("#projeto-mater");
  await expect(cartao).toContainText("demonstração em breve");
  await expect(cartao.locator('a[href*="github.com"]')).toHaveCount(0);
});

test("rótulos de estimativa visíveis", async ({ page }) => {
  await page.goto("/");
  const texto = await page.locator("body").innerText();
  expect(texto).toContain("estimativa da proprietária");
  expect(texto).toContain("30 min por falha");
  expect(texto).toContain("falhas plantadas");
});

test("site não oferece CV para baixar", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href*="cv"], a[download]')).toHaveCount(0);
});

test("Mater descrita com linguagem profissional", async ({ page }) => {
  await page.goto("/");
  const cartao = page.locator("#projeto-mater");
  await expect(cartao.locator("h3")).toHaveText("Site de pedidos e painel de gestão · Mater Bakery Box");
  const texto = await page.locator("body").innerText();
  expect(texto).not.toMatch(/painel da dona|da dona/);
});

test("contato convida para um problema, sem pedir emprego", async ({ page }) => {
  await page.goto("/");
  const intro = page.locator("#contato .secao__intro");
  await expect(intro).toHaveText("Tem um problema de negócio que a IA pode resolver? Eu construo a solução e meço se ela funciona.");
});

test("ferramentas do trabalho mostram a stack completa", async ({ page }) => {
  await page.goto("/");
  const chips = await page.locator(".chips--sobrio li").allInnerTexts();
  for (const f of ["TypeScript", "Reqnroll", "MongoDB", "SQL Server", "Rest Assured", "WireMock", "Postman", "Allure", "Kiro"]) expect(chips).toContain(f);
});
