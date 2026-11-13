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

const WORKER = "https://triagem-ao-vivo.**/triagem";
const ERRO_COLADO = "TimeoutError: page.waitForSelector: Timeout 30000ms exceeded waiting for '#pagar'";
const TRIAGEM_VIVO = {
  categoria: "teste_instavel", confianca: 0.66, resumo: "Resumo ao vivo em português", passos: ["Abrir"],
  esperado: "e", obtido: "o", causaProvavel: "c", sugestaoCorrecao: "s",
};
async function colar(page, texto = ERRO_COLADO) {
  await page.locator("#lab-erro").fill(texto);
}

test.describe("laboratório: análise ao vivo", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.__labUrl = "https://triagem-ao-vivo.teste.workers.dev/triagem"; });
  });

  test("antes da primeira análise mostra 'até 5 análises por dia'", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#lab-restantes")).toHaveText("até 5 análises por dia");
  });

  test("análise ao vivo mostra o cartão e 'restam 4 hoje'", async ({ page }) => {
    let corpo;
    await page.route(WORKER, (r) => { corpo = r.request().postDataJSON(); r.fulfill({ json: { triagem: TRIAGEM_VIVO, restantes: 4 } }); });
    await page.goto("/");
    await colar(page);
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.locator("#lab-resultado")).toContainText("Resumo ao vivo em português");
    await expect(page.locator("#lab-resultado .lab-categoria")).toHaveText("teste instável");
    await expect(page.locator("#lab-restantes")).toHaveText("restam 4 hoje");
    expect(corpo).toEqual({ erro: ERRO_COLADO, codigo: "", lingua: "pt" });
  });

  test("texto com mais de 4000 caracteres ou menos de 20 é recusado sem chamar a rede", async ({ page }) => {
    let chamadas = 0;
    await page.route(WORKER, (r) => { chamadas++; r.fulfill({ json: { triagem: TRIAGEM_VIVO, restantes: 4 } }); });
    await page.goto("/");
    await colar(page, "x".repeat(4001));
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.locator("#lab-mensagem")).toContainText("4.000");
    await colar(page, "curto demais");
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.locator("#lab-mensagem")).toContainText("20 caracteres");
    expect(chamadas).toBe(0);
  });

  test("429 limite_pessoa mostra a mensagem e os exemplos seguem funcionando", async ({ page }) => {
    await page.route("**/dados/exemplos-triagem.json", (r) => r.fulfill({ json: FIXTURE }));
    await page.route(WORKER, (r) => r.fulfill({ status: 429, json: { erro: "limite_pessoa", mensagem: "x", restantes: 0 } }));
    await page.goto("/");
    await colar(page);
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.locator("#lab-mensagem")).toHaveText("Você usou as 5 análises de hoje. Os exemplos continuam funcionando.");
    await expect(page.locator("#lab-restantes")).toHaveText("restam 0 hoje");
    await page.getByRole("button", { name: FIXTURE.exemplos[0].rotulo.pt }).click();
    await expect(page.locator("#lab-resultado .lab-gabarito")).toBeVisible();
  });

  test("Worker fora do ar mostra o erro e os exemplos seguem funcionando", async ({ page }) => {
    await page.route("**/dados/exemplos-triagem.json", (r) => r.fulfill({ json: FIXTURE }));
    await page.route(WORKER, (r) => r.abort());
    await page.goto("/");
    await colar(page);
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.locator("#lab-mensagem")).toHaveText("A IA ao vivo não está disponível agora. Os exemplos continuam funcionando.");
    await expect(page.getByRole("button", { name: "Analisar" })).toBeEnabled();
    await page.getByRole("button", { name: FIXTURE.exemplos[0].rotulo.pt }).click();
    await expect(page.locator("#lab-resultado .lab-gabarito")).toBeVisible();
  });

  test("Worker que não responde: o tempo limite encerra a espera", async ({ page }) => {
    await page.addInitScript(() => { window.__labLimiteMs = 300; });
    await page.route(WORKER, () => {}); // nunca responde
    await page.goto("/");
    await colar(page);
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.locator("#lab-mensagem")).toHaveText("A IA ao vivo não está disponível agora. Os exemplos continuam funcionando.");
    await expect(page.getByRole("button", { name: "Analisar" })).toBeEnabled();
  });

  test("clique duplo faz uma chamada só", async ({ page }) => {
    let chamadas = 0;
    let liberar;
    const espera = new Promise((ok) => { liberar = ok; });
    await page.route(WORKER, async (r) => { chamadas++; await espera; r.fulfill({ json: { triagem: TRIAGEM_VIVO, restantes: 4 } }); });
    await page.goto("/");
    await colar(page);
    const botao = page.getByRole("button", { name: "Analisar" });
    await botao.dblclick();
    await expect(botao).toBeDisabled();
    liberar();
    await expect(page.locator("#lab-resultado")).toContainText("Resumo ao vivo");
    expect(chamadas).toBe(1);
  });

  test("resultado ao vivo mantém a língua em que foi gerado, com a nota", async ({ page }) => {
    await page.route(WORKER, (r) => r.fulfill({ json: { triagem: TRIAGEM_VIVO, restantes: 4 } }));
    await page.goto("/");
    await colar(page);
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.locator("#lab-resultado")).toContainText("Resumo ao vivo em português");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.locator("#lab-resultado")).toContainText("Resumo ao vivo em português");
    await expect(page.locator("#lab-resultado .lab-nota")).toHaveText("generated in Portuguese");
    await expect(page.locator("#lab-resultado .lab-categoria")).toHaveText("flaky test");
  });

  test("rótulo do acerto mostra os números do indice.json", async ({ page }) => {
    await page.route("https://luizhenrisouto.github.io/triagem-de-falhas-ia/dados/indice.json", (r) =>
      r.fulfill({ json: { atualizadoEm: "2026-11-20T12:00:00Z", totais: { execucoes: 9, falhasTriadas: 31, acertoMedioPct: 97, custoTotalUsd: 0, horasEconomizadas: 2 } } }));
    await page.goto("/");
    await expect(page.locator("#lab-acerto")).toHaveText(
      "Acerto da mesma IA na triagem do CI, que também recebe o print da tela: 97% em 31 falhas · suíte de demonstração com gabarito");
  });
});

test("sem o endereço do servidor configurado, a análise ao vivo fica desligada e nada é enviado", async ({ page }) => {
  await page.addInitScript(() => { window.__labUrl = ""; });
  const chamadas = [];
  page.on("request", (r) => { if (r.url().includes("workers.dev")) chamadas.push(r.url()); });
  await page.goto("/");
  await page.locator("#lab-erro").fill("TimeoutError: page.waitForSelector: Timeout 30000ms exceeded");
  await expect(page.getByRole("button", { name: "Analisar" })).toBeDisabled();
  await expect(page.locator("#lab-restantes")).toHaveText("análise ao vivo em breve");
  expect(chamadas).toEqual([]);
});

test("botões de exemplo alinhados numa grade de mesma largura", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const caixas = await page.locator(".lab-exemplo").evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().toJSON()));
  expect(caixas).toHaveLength(4);
  const larguras = new Set(caixas.map((c) => Math.round(c.width)));
  expect(larguras.size).toBe(1);
  expect(Math.round(caixas[0].left)).toBe(Math.round(caixas[2].left));
  expect(Math.round(caixas[1].left)).toBe(Math.round(caixas[3].left));
  expect(Math.round(caixas[0].top)).toBe(Math.round(caixas[1].top));
  expect(Math.round(caixas[0].height)).toBe(Math.round(caixas[1].height));
});
