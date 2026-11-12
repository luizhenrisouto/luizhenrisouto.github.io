import { test, expect } from "@playwright/test";
import { URL_TRIAGEM } from "../../js/dados.js";
import { TEXTOS } from "../../js/i18n.js";

const vivo = (page) =>
  page.route(URL_TRIAGEM, (r) =>
    r.fulfill({
      json: {
        atualizadoEm: "2026-11-20T12:00:00Z",
        totais: { execucoes: 9, falhasTriadas: 31, acertoMedioPct: 97, custoTotalUsd: 0.12, horasEconomizadas: 1.9485 },
      },
    }),
  );

test.use({ locale: "pt-BR" });

test("troca para EN e volta", async ({ page }) => {
  await vivo(page);
  await page.goto("/");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.locator("h1")).toHaveText("QA who builds AI tools. And ships them.");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "PT" }).click();
  await expect(page.locator("h1")).toHaveText("QA que constrói ferramentas com IA. E coloca no ar.");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
});

test("números mudam de formato no EN", async ({ page }) => {
  await vivo(page);
  await page.goto("/");
  await expect(page.locator('[data-num="horasTriagem"]')).toHaveText("1,9");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.locator('[data-num="horasTriagem"]')).toHaveText("1.9");
  await expect(page.locator('[data-num="atualizado"]')).toHaveText("Nov 20, 2026");
});

test("lembra a escolha ao recarregar", async ({ page }) => {
  await vivo(page);
  await page.goto("/");
  await page.getByRole("button", { name: "EN" }).click();
  await page.reload();
  await expect(page.locator("h1")).toHaveText("QA who builds AI tools. And ships them.");
});

test("funciona com localStorage bloqueado", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.addInitScript(() => {
    const falha = () => { throw new DOMException("bloqueado", "SecurityError"); };
    Object.defineProperty(window, "localStorage", { get: falha });
  });
  await vivo(page);
  await page.goto("/");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.locator("h1")).toHaveText("QA who builds AI tools. And ships them.");
  expect(erros).toEqual([]);
});

test("todas as chaves da página existem em TEXTOS", async ({ page }) => {
  await page.goto("/");
  const chaves = await page.locator("[data-i18n]").evaluateAll((es) => [...new Set(es.map((e) => e.dataset.i18n))]);
  for (const c of chaves) {
    expect(TEXTOS.pt[c], `pt.${c}`).toBeTruthy();
    expect(TEXTOS.en[c], `en.${c}`).toBeTruthy();
  }
});

test("textos em PT do HTML batem com TEXTOS.pt", async ({ page }) => {
  await page.goto("/");
  const pares = await page.locator("[data-i18n]").evaluateAll((es) => es.map((e) => [e.dataset.i18n, e.textContent.trim()]));
  for (const [c, t] of pares) expect(t, c).toBe(TEXTOS.pt[c]);
});

test.describe("navegador em inglês", () => {
  test.use({ locale: "en-US" });
  test("abre em EN sem escolha salva", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
