import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { URL_TRIAGEM } from "../../js/dados.js";

const RESERVA = JSON.parse(readFileSync(new URL("../../dados/reserva.json", import.meta.url), "utf8"));

const indice = (totais) => ({
  atualizadoEm: "2026-11-20T12:00:00Z",
  totais: { execucoes: 9, falhasTriadas: 31, acertoMedioPct: 97, custoTotalUsd: 0.12, horasEconomizadas: 3.25, ...totais },
});

test("mostra os números ao vivo", async ({ page }) => {
  await page.route(URL_TRIAGEM, (r) => r.fulfill({ json: indice({}) }));
  await page.goto("/");
  await expect(page.locator('#topo [data-num="falhas"]')).toHaveText("31");
  await expect(page.locator('#topo [data-num="acerto"]')).toHaveText("97%");
  await expect(page.locator('[data-num="horasTriagem"]')).toHaveText("3,3");
  await expect(page.locator('[data-num="atualizado"]')).toHaveText("20/11/2026");
});

test("usa a reserva e mostra a data quando a leitura falha", async ({ page }) => {
  await page.route(URL_TRIAGEM, (r) => r.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-dados", "reserva");
  await expect(page.locator('#topo [data-num="falhas"]')).toHaveText(String(RESERVA.totais.falhasTriadas));
  const [a, m, d] = RESERVA.atualizadoEm.slice(0, 10).split("-");
  await expect(page.locator('[data-num="atualizado"]')).toHaveText(`${d}/${m}/${a}`);
});

test("nunca mostra NaN ou undefined", async ({ page }) => {
  await page.route(URL_TRIAGEM, (r) => r.fulfill({ json: { totais: {} } }));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-dados", "reserva");
  const texto = await page.locator("body").innerText();
  expect(texto).not.toMatch(/NaN|undefined/);
});

test("data inválida ao vivo usa a reserva, também em EN", async ({ page }) => {
  await page.route(URL_TRIAGEM, (r) => r.fulfill({ json: { ...indice({}), atualizadoEm: "lixo" } }));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-dados", "reserva");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  const [a, m, d] = RESERVA.atualizadoEm.slice(0, 10).split("-");
  const mes = new Date(Date.UTC(+a, +m - 1, +d)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  await expect(page.locator('[data-num="atualizado"]')).toHaveText(`${mes} ${+d}, ${a}`);
});

test("rótulo da fonte diz quando é reserva e que a suíte é de demonstração", async ({ page }) => {
  await page.route(URL_TRIAGEM, (r) => r.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-dados", "reserva");
  await expect(page.locator(".atualizado")).toContainText("cópia de reserva");
  await expect(page.locator(".atualizado")).toContainText("suíte de demonstração");
  await expect(page.locator(".atualizado")).not.toContainText("ao vivo");
});

test("rótulo da fonte ao vivo cita a suíte de demonstração", async ({ page }) => {
  await page.route(URL_TRIAGEM, (r) => r.fulfill({ json: indice({}) }));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-dados", "ao-vivo");
  await expect(page.locator(".atualizado")).toContainText("ao vivo");
  await expect(page.locator(".atualizado")).toContainText("suíte de demonstração");
});

test("página não promete uso real que ainda não foi medido", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator("body").innerText()).not.toContain("uso real");
});
