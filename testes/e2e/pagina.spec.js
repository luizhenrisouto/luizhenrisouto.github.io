import { test, expect } from "@playwright/test";

test("seções na ordem aprovada", async ({ page }) => {
  await page.goto("/");
  const ids = await page.locator("main > section").evaluateAll((s) => s.map((e) => e.id));
  expect(ids).toEqual(["topo", "projetos", "laboratorio", "como-testo", "trajetoria", "ferramentas", "contato"]);
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

test("experiência em casos, por importância, sem anos", async ({ page }) => {
  await page.goto("/");
  const secao = page.locator("#trajetoria");
  expect(await secao.innerText()).not.toMatch(/\b(19|20)\d{2}\b/);
  const casos = secao.locator(".caso");
  await expect(casos).toHaveCount(7);
  await expect(casos.first()).toHaveClass(/caso--destaque/);
  await expect(casos.first()).toContainText("Unimed Porto Alegre");
  await expect(casos.first()).not.toContainText("atual");
  for (const empresa of ["Renner", "Getnet", "MAG Seguros", "Via Varejo", "ONS", "Abastece Aí"]) await expect(secao).toContainText(empresa);
  await expect(secao.locator(".casos__rodape")).toHaveCount(0);
});

test("brilho segue o mouse dentro dos cartões", async ({ page }) => {
  await page.goto("/");
  const cartao = page.locator("#projeto-triagem");
  await cartao.scrollIntoViewIfNeeded();
  const caixa = await cartao.boundingBox();
  await page.mouse.move(caixa.x + 40, caixa.y + 30);
  await page.mouse.move(caixa.x + 60, caixa.y + 50);
  await expect(cartao).toHaveClass(/brilho/);
  const mx = await cartao.evaluate((e) => e.style.getPropertyValue("--mx"));
  expect(mx).toBe("60px");
  const casos = await page.locator("#trajetoria .caso.brilho").count();
  expect(casos).toBe(await page.locator("#trajetoria .caso").count());
});

test("prévia de compartilhamento: título, descrição e imagem para LinkedIn e WhatsApp", async ({ page, request }) => {
  await page.goto("/");
  const meta = (sel) => page.locator(`head meta[${sel}]`).getAttribute("content");
  expect(await meta('property="og:title"')).toBe("Luiz Henri Souto · Do teste ao produto. Agora com IA.");
  expect(await meta('property="og:description"')).toMatch(/triagem de falhas de teste com IA/);
  expect(await meta('property="og:url"')).toBe("https://luizhenrisouto.github.io/");
  expect(await meta('property="og:image"')).toBe("https://luizhenrisouto.github.io/img/previa.png");
  expect(await meta('property="og:image:width"')).toBe("2400");
  expect(await meta('property="og:image:height"')).toBe("1260");
  expect(await meta('name="twitter:card"')).toBe("summary_large_image");
  const img = await request.get("/img/previa.png");
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toMatch(/image\/png/);
});

test("o título do topo quebra depois da primeira frase, em português e em inglês", async ({ page }) => {
  const linhas = () =>
    page.locator("h1").evaluate((h) => {
      const t = h.textContent, porLinha = {};
      for (let i = 0; i < t.length; i++) {
        const r = document.createRange(); r.setStart(h.firstChild, i); r.setEnd(h.firstChild, i + 1);
        const y = Math.round(r.getBoundingClientRect().top);
        porLinha[y] = (porLinha[y] ?? "") + t[i];
      }
      return Object.values(porLinha).map((l) => l.trim());
    });
  for (const largura of [1024, 1366, 1920]) {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "PT", exact: true }).click(); // a escolha de idioma fica salva entre as páginas
    expect(await linhas(), `pt ${largura}`).toEqual(["Do teste ao produto.", "Agora com IA."]);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    expect(await linhas(), `en ${largura}`).toEqual(["From testing to product.", "Now with AI."]);
  }
});
