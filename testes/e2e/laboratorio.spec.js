import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const FIXTURE = JSON.parse(readFileSync(new URL("./fixtures/exemplos-triagem.json", import.meta.url), "utf8"));
const comExemplos = (page) => page.route("**/dados/exemplos-triagem.json", (r) => r.fulfill({ json: FIXTURE }));

test.describe("laboratório: exemplos", () => {
  test("clicar num exemplo mostra o resultado sem chamar o Worker", async ({ page }) => {
    const chamadasWorker = [];
    page.on("request", (r) => { if (r.url().includes("workers.dev")) chamadasWorker.push(r.url()); });
    await comExemplos(page);
    await page.goto("/");
    await page.getByRole("button", { name: FIXTURE.exemplos[0].rotulo.pt }).click();
    const cartao = page.locator("#lab-resultado");
    await expect(cartao.locator(".lab-categoria")).toHaveText("bug do produto");
    await expect(cartao).toContainText(FIXTURE.exemplos[0].respostas.pt.resumo);
    await expect(cartao.locator(".lab-gabarito")).toHaveText("gabarito: bug do produto ✓");
    await expect(page.locator("#lab-erro")).toHaveValue(FIXTURE.exemplos[0].erro);
    expect(chamadasWorker).toEqual([]);
  });

  test("exemplo com acertou=false mostra ✗", async ({ page }) => {
    await comExemplos(page);
    await page.goto("/");
    await page.getByRole("button", { name: FIXTURE.exemplos[1].rotulo.pt }).click();
    await expect(page.locator("#lab-resultado .lab-gabarito")).toHaveText("gabarito: bug do produto ✗");
  });

  test("texto malicioso na resposta aparece como texto", async ({ page }) => {
    await comExemplos(page);
    await page.goto("/");
    await page.getByRole("button", { name: FIXTURE.exemplos[2].rotulo.pt }).click();
    const cartao = page.locator("#lab-resultado");
    await expect(cartao).toContainText("<img src=x onerror=window.__x=1>");
    await expect(cartao.locator("img")).toHaveCount(0);
    expect(await page.evaluate(() => window.__x)).toBeUndefined();
  });

  test("troca de idioma troca a resposta do exemplo", async ({ page }) => {
    await comExemplos(page);
    await page.goto("/");
    await page.getByRole("button", { name: FIXTURE.exemplos[0].rotulo.pt }).click();
    await page.getByRole("button", { name: "EN", exact: true }).click();
    const cartao = page.locator("#lab-resultado");
    await expect(cartao).toContainText(FIXTURE.exemplos[0].respostas.en.resumo);
    await expect(cartao.locator(".lab-categoria")).toHaveText("product bug");
    await expect(page.getByRole("button", { name: FIXTURE.exemplos[0].rotulo.en })).toBeVisible();
  });

  test("360px sem rolagem lateral com um resultado aberto", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await comExemplos(page);
    await page.goto("/");
    await page.getByRole("button", { name: FIXTURE.exemplos[0].rotulo.pt }).click();
    await expect(page.locator("#lab-resultado .lab-categoria")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  test("mostra o aviso de dados confidenciais", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#laboratorio")).toContainText("Não cole dados confidenciais: a análise usa o Gemini no plano gratuito.");
  });
});
