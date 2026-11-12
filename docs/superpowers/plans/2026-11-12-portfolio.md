# Portfólio pessoal — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site estático escuro ("pipeline azul elétrico") em PT/EN que prova "QA que constrói ferramentas com IA que funcionam de verdade", com números ao vivo da triagem, e CV em PDF (PT/EN) específico para as vagas de GenAI do iFood.

**Architecture:** O site usa HTML, CSS e JavaScript puros (módulos ES), sem build, servidos como arquivos estáticos.
- A lógica pura fica em `js/dados.js` e `js/i18n.js`, testada com Vitest.
- A página é testada com Playwright contra um servidor Node mínimo.
- O CV é um HTML por idioma, convertido em PDF com o Chromium do Playwright.

**Tech Stack:** HTML/CSS/JS (ES modules), Google Fonts (Geist, Geist Mono), Node 20+, Vitest, @playwright/test.

**Spec:** `docs/superpowers/specs/2026-11-12-portfolio-design.md`

## Global Constraints

- **Sem build e sem framework.** As únicas dependências são de desenvolvimento: `vitest` e `@playwright/test`.
- **Paleta:** fundo `#0a0d16` com brilho `#1a2550`, texto `#eef1fa`, secundário `#8a93ad`, bordas `#262e45`, grade `#1a2033`, acento `#5b8cff`, sucesso `#3ddc97`.
- **Fontes:** Geist para títulos e texto, Geist Mono só para rótulos técnicos e números pequenos.
- **Modo escuro fixo,** sem botão de tema.
- **`prefers-reduced-motion: reduce`:** nenhuma animação, e todas as etapas aparecem acesas.
- **Elementos vetados** (vêm do site de referência): terminal verde, Fira Code, retrato ASCII, lista `[ OK ]` e "Hello, World".
- **Nenhum nome de empregador** (atual ou passado), **nenhum nome de sistema interno do trabalho**, **nenhum telefone** no site nem nos PDFs.
  - A lista de termos vetados fica em `testes/vetados.local.json`, **ignorado pelo git**. A própria lista contém os nomes e não pode ir para o repositório público.
  - Os testes falham se o arquivo não existir.
- **Nenhum dado de cliente da Mater.** Nada de captura do painel real.
- **Rótulos de estimativa obrigatórios:**
  - Mater: "estimativa da dona: ~30 min por pedido × 8 pedidos/semana".
  - Triagem: "estimativa: 30 min por falha".
  - Suíte da triagem: "suíte de demonstração com falhas plantadas e gabarito".
- **Fonte dos dados ao vivo:** `https://luizhenrisouto.github.io/triagem-de-falhas-ia/dados/indice.json`.
  - Campos usados de `totais`: `execucoes`, `falhasTriadas`, `acertoMedioPct`, `custoTotalUsd`, `horasEconomizadas`, além de `atualizadoEm`.
  - Se a leitura falhar, usar `dados/reserva.json` e exibir a data.
- **Cartão da Mater:** "demonstração em breve". Sem link de código até o repositório genérico ser público.
- **FIAP no CV:** "Tecnólogo em Inteligência Artificial — FIAP" com o **status real**, confirmado com o usuário antes de gerar o PDF final. Nunca "cursando" antes do início das aulas.
- **Commits:** sempre com `git -c user.name="Luiz Henri Souto" -c user.email="luizhenrisouto@users.noreply.github.com" commit ...`, ou com a identidade configurada localmente no repositório (Task 1).
- **Sem push e sem criar repositório remoto.** A publicação é feita com o usuário (Task 7).

## Review Focus

1. **Leitura ao vivo devolve JSON parcial ou com campo ausente ou não numérico.** O esperado é cair na reserva e não mostrar "NaN" nem "undefined". Coberto por `lerTriagem` com `totais` incompleto (Task 2).
2. **Celular com 360 px de largura.** O pipeline de 5 etapas não pode causar rolagem horizontal. Coberto pelo teste de largura em 360 px (Task 3).
3. **Troca para EN com textos dinâmicos já carregados.** Os números e rótulos ao vivo precisam mudar de idioma junto, inclusive o formato decimal (1,9 → 1.9). Coberto pelo teste de idioma depois de os dados carregarem (Task 5).
4. **`localStorage` bloqueado (aba anônima ou cookies bloqueados).** A troca de idioma tem que funcionar mesmo sem salvar. Coberto pelo teste com `localStorage` que lança erro (Task 5).
5. **Termo vetado entrando por texto novo** (CV ou cópia em EN). Coberto pela varredura de termos vetados em todos os HTML e no texto extraído dos PDFs (Tasks 3 e 6).

---

## Estrutura de arquivos

```
site-pessoal/
  index.html                  página única
  css/estilo.css              tokens, layout, efeitos
  js/dados.js                 leitura ao vivo + reserva + formatação (puro)
  js/i18n.js                  textos PT/EN + escolha de idioma (puro)
  js/app.js                   liga dados e i18n ao DOM
  dados/reserva.json          cópia datada do indice.json (manual)
  dados/projetos.json         números fixos: testes do painel, estimativa da Mater
  cv/cv-pt.html, cv/cv-en.html, cv/cv.css
  cv/luiz-souto-cv-pt.pdf, cv/luiz-souto-cv-en.pdf
  scripts/servir.mjs          servidor estático para testes
  scripts/gerar-cv.mjs        HTML → PDF
  scripts/atualizar-reserva.mjs  baixa indice.json para dados/reserva.json
  testes/unit/*.test.js       Vitest
  testes/e2e/*.spec.js        Playwright
  testes/vetados.local.json   (git-ignored) termos proibidos
  README.md
```

---

### Task 1: Repositório e base de testes

**Files:**
- Create: `package.json`, `.gitignore`, `vitest.config.js`, `playwright.config.js`, `scripts/servir.mjs`, `testes/vetados.local.json`, `testes/e2e/servidor.spec.js`, `index.html` (esqueleto com `<title>Luiz Henri Souto · QA</title>`)

**Interfaces:**
- Produces:
  - `npm test` roda o Vitest em `testes/unit`.
  - `npm run test:e2e` roda o Playwright em `testes/e2e`, com `webServer` = `node scripts/servir.mjs` na porta **4180** e `baseURL` `http://127.0.0.1:4180`.
  - O arquivo `testes/vetados.local.json` tem o formato `{ "termos": string[] }`.

- [ ] **Step 1:** `git init` e configuração local do repositório: `user.name "Luiz Henri Souto"`, `user.email "luizhenrisouto@users.noreply.github.com"`.
  - `.gitignore`: `node_modules/`, `.superpowers/`, `test-results/`, `playwright-report/`, `testes/vetados.local.json`.
  - `npm i -D vitest @playwright/test`.
- [ ] **Step 2: Lista de termos vetados.**
  - Criar `testes/vetados.local.json` com os nomes de empregadores e sistemas do CV original: os empregadores listados no CV, os nomes dos sistemas internos do empregador atual e o nome da consultoria.
  - Acrescentar os elementos vetados do site de referência (`"Hello, World"`, `"[ OK ]"`, `"Fira Code"`).
  - Acrescentar o padrão de telefone, que o teste checa à parte com a regex `/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/`.
  - Confirmar com `git status` que o arquivo **não aparece**.
- [ ] **Step 3: Escrever o teste que falha** `testes/e2e/servidor.spec.js`: "serve a página inicial". `page.goto('/')`, e o título deve conter `Luiz Henri Souto`.
- [ ] **Step 4:** Rodar `npm run test:e2e`. Esperado: FAIL, porque o servidor ainda não existe.
- [ ] **Step 5:** Implementar `scripts/servir.mjs`.
  - Usa `node:http`, porta da variável `PORT` com padrão 4180.
  - Serve arquivos da raiz do repositório com `Content-Type` por extensão (`.html .css .js .json .pdf .svg`).
  - Devolve 404 para caminhos com `..`.
- [ ] **Step 6:** Rodar `npm run test:e2e`. Esperado: PASS 1/1.
- [ ] **Step 7:** Commit `chore: base do site e dos testes`.

---

### Task 2: Dados da triagem (ao vivo + reserva + formatação)

**Files:**
- Create: `js/dados.js`, `dados/reserva.json`, `scripts/atualizar-reserva.mjs`, `testes/unit/dados.test.js`

**Interfaces:**
- Consumes: nada.
- Produces (`js/dados.js`, módulo ES):
  - `URL_TRIAGEM = "https://luizhenrisouto.github.io/triagem-de-falhas-ia/dados/indice.json"`
  - `async lerTriagem({ buscar, reserva }) -> { fonte: "ao-vivo" | "reserva", atualizadoEm: string, execucoes: number, falhasTriadas: number, acertoMedioPct: number, custoTotalUsd: number, horasEconomizadas: number }`
    - `buscar(url)` tem a forma de `fetch`.
    - `reserva` é o objeto de `reserva.json`, no mesmo formato do `indice.json`.
  - `formatarNumero(n, lingua, casas)`: usa `Intl.NumberFormat`, com `"pt"` virando `pt-BR` e `"en"` virando `en-US`.
  - `formatarUsd(n, lingua)`
  - `formatarData(iso, lingua)`: devolve `dd/mm/aaaa` em PT e `MMM d, yyyy` em EN.

- [ ] **Step 1: Escrever os testes que falham** em `testes/unit/dados.test.js`:
  - `"usa os totais ao vivo quando a leitura funciona"`
    - `buscar` resolve `{ ok: true, json: () => ({ atualizadoEm: "2026-11-12T18:47:33Z", totais: { execucoes: 6, falhasTriadas: 24, acertoMedioPct: 100, custoTotalUsd: 0, horasEconomizadas: 1.9485 } }) }`.
    - Esperado: `fonte === "ao-vivo"` e `falhasTriadas === 24`.
  - `"cai na reserva quando a rede falha"`: `buscar` rejeita. Esperado: `fonte === "reserva"`, com os valores da reserva.
  - `"cai na reserva quando a resposta não é ok"`: `{ ok: false }`.
  - `"cai na reserva quando falta campo ou não é número"`: `totais.acertoMedioPct: "100"`, ou `horasEconomizadas` ausente.
  - `"formata horas no idioma"`: `formatarNumero(1.9485, "pt", 1) === "1,9"` e `formatarNumero(1.9485, "en", 1) === "1.9"`.
  - `"formata data no idioma"`: `formatarData("2026-11-12T18:47:33Z", "pt") === "12/11/2026"`.
- [ ] **Step 2:** Rodar `npx vitest run testes/unit/dados.test.js`. Esperado: FAIL, porque o módulo não existe.
- [ ] **Step 3:** Implementar `js/dados.js`. A validação exige os 5 campos de `totais` como `Number.isFinite` e `atualizadoEm` como string.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS 6/6.
- [ ] **Step 5:** Implementar `scripts/atualizar-reserva.mjs`.
  - Baixa `URL_TRIAGEM` e grava `dados/reserva.json` formatado.
  - Antes de gravar, valida os campos com a mesma regra, importando de `js/dados.js`.
  - Rodar `node scripts/atualizar-reserva.mjs`. Esperado: o arquivo é criado, com `totais.falhasTriadas >= 24`.
- [ ] **Step 6:** Commit `feat: leitura dos números da triagem com reserva`.

---

### Task 3: Página, visual e efeitos

**Files:**
- Modify: `index.html`
- Create: `css/estilo.css`, `dados/projetos.json`, `testes/e2e/pagina.spec.js`, `testes/e2e/vetados.spec.js`

**Interfaces:**
- Consumes: nada de JS (a página precisa ser legível sem JS).
- Produces: marcação que as Tasks 4 e 5 preenchem.
  - `data-i18n="<chave>"` em todo texto traduzível.
  - Seções com os ids `#topo`, `#projetos`, `#como-testo`, `#trajetoria`, `#ferramentas`, `#contato`, nessa ordem.
  - Pipeline do topo: `.pipeline > .etapa` (5 itens, o último com `.etapa--impacto`).
  - Destinos dos números: `[data-num="horasMater"]`, `[data-num="acerto"]`, `[data-num="falhas"]`, `[data-num="custo"]`, `[data-num="horasTriagem"]`, `[data-num="execucoes"]`, `[data-num="testesPainel"]`, `[data-num="atualizado"]`.
  - `dados/projetos.json`:
    - `{ "mater": { "horasSemana": 4, "minPorPedido": 30, "pedidosSemana": 8, "situacao": "estimativa" }, "painel": { "testes": <n> } }`
    - O `<n>` é a contagem real de testes que passam em `C:\Users\00783_luiz\Aut\mater-bakery\painel-pedidos`, obtida com `npx vitest run` lá.
    - Só o número sai de lá; nada do repositório privado é copiado.

- [ ] **Step 1: Escrever os testes que falham** em `testes/e2e/pagina.spec.js`:
  - `"seções na ordem aprovada"`: os ids das `main > section` na ordem `["topo","projetos","como-testo","trajetoria","ferramentas","contato"]`.
  - `"pipeline do topo tem 5 etapas e termina no impacto"`.
  - `"sem rolagem horizontal em 360px"`: com viewport 360×800, `document.documentElement.scrollWidth <= 360`.
  - `"movimento reduzido mostra tudo aceso"`: com `page.emulateMedia({ reducedMotion: "reduce" })`, toda `.etapa` tem `opacity` computado `"1"` e `animationName` igual a `"none"`.
  - `"cartão da Mater sem demo nem código"`: o cartão `#projeto-mater` contém o texto `demonstração em breve` e nenhum `a[href*="github.com"]`.
  - `"rótulos de estimativa visíveis"`: a página contém `estimativa da dona`, `30 min por falha` e `falhas plantadas`.
- [ ] **Step 2:** Escrever o teste que falha `testes/e2e/vetados.spec.js`, `"nenhum termo vetado nem telefone"`.
  - Lê `testes/vetados.local.json` e falha com a mensagem "crie testes/vetados.local.json" se ele não existir.
  - Para cada `.html` do repositório (fora de `node_modules`), o texto em minúsculas não contém nenhum termo, e a regex de telefone não casa.
- [ ] **Step 3:** Rodar `npm run test:e2e`. Esperado: FAIL nos testes novos.
- [ ] **Step 4:** Escrever `index.html` com o conteúdo do spec, seção "Estrutura da página", em PT como padrão.
  - Menu `luiz.souto` com âncoras e os botões `PT` / `EN` (`button[data-lingua]`).
  - **Topo:**
    - Título "QA que constrói ferramentas com IA. E coloca no ar.".
    - Pipeline "ideia → build com IA → testes → deploy → impacto ~4 h/semana", com o rótulo da estimativa.
    - Botões "Ver projetos" (`#projetos`) e "Baixar CV" (`cv/luiz-souto-cv-pt.pdf`, id `#baixar-cv`).
    - Três números: acerto, falhas triadas e custo.
    - Indicador "2 projetos em produção" com ponto pulsando.
  - **Projetos:** cartões `#projeto-triagem` e `#projeto-mater`.
    - O da triagem tem o link "ver relatório ao vivo" para `https://luizhenrisouto.github.io/triagem-de-falhas-ia/` e o código em `https://github.com/luizhenrisouto/triagem-de-falhas-ia`.
  - **Demais seções:** "Como eu testo" (tabela do spec), "Trajetória" (por setor, mais a linha da FIAP com status igual ao do CV), "Ferramentas" (dois grupos) e "Contato".
    - O contato tem o GitHub e o LinkedIn (`LINKEDIN_URL` informado pelo usuário).
    - E-mail só se o usuário confirmar.
  - **Valores iniciais:** os números vêm de `reserva.json` e `projetos.json`, escritos no HTML como valores iniciais. Assim a página já mostra dados sem JS.
- [ ] **Step 5:** Escrever `css/estilo.css`.
  - Tokens da paleta em `:root`.
  - Grade com `mask-image` radial.
  - Animações `acende` e `corre`, com ciclo de 6 s e atraso de 0,8 s entre etapas, como no esboço `pipeline-dark.html`, opção 1.
  - Contorno e brilho na `.etapa--impacto` e pulso no ponto "no ar".
  - Mini-pipeline nos cartões.
  - Abaixo de 640 px, o pipeline fica **vertical**.
  - Bloco `@media (prefers-reduced-motion: reduce)` zerando as animações, com `opacity: 1`.
  - Foco de teclado visível em links e botões.
- [ ] **Step 6:** Rodar `npm run test:e2e`. Esperado: PASS em todos os testes.
- [ ] **Step 7:** Tirar capturas em 1280 px e 375 px e revisar com olho de designer, comparando com o esboço. Ajustar o que destoar e rodar de novo.
- [ ] **Step 8:** Commit `feat: página do portfólio com pipeline animado`.

---

### Task 4: Números ao vivo na página

**Files:**
- Create: `js/app.js`, `testes/e2e/numeros.spec.js`
- Modify: `index.html` (`<script type="module" src="js/app.js">`)

**Interfaces:**
- Consumes:
  - `lerTriagem`, `formatarNumero`, `formatarUsd`, `formatarData`, `URL_TRIAGEM` (Task 2);
  - os seletores `[data-num=...]` (Task 3).
- Produces: `export function pintarNumeros(doc, triagem, projetos, lingua)` em `js/app.js`. A Task 5 a chama de novo ao trocar de idioma. O estado fica em `window.__portfolio = { triagem, projetos, lingua }` para os testes.

- [ ] **Step 1: Escrever os testes que falham** em `testes/e2e/numeros.spec.js`:
  - `"mostra os números ao vivo"`: `page.route(URL_TRIAGEM)` responde um JSON com `falhasTriadas: 31` e `acertoMedioPct: 97`. Esperado: `[data-num="falhas"]` com `31` e `[data-num="acerto"]` com `97%`.
  - `"usa a reserva e mostra a data quando a leitura falha"`: `route.abort()`. Esperado: `[data-num="falhas"]` igual a `totais.falhasTriadas` da reserva, e `[data-num="atualizado"]` com a data da reserva em `dd/mm/aaaa`.
  - `"nunca mostra NaN ou undefined"`: `route` responde `{ "totais": {} }`. Esperado: o `body` não contém `NaN` nem `undefined`.
- [ ] **Step 2:** Rodar `npx playwright test testes/e2e/numeros.spec.js`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `js/app.js`.
  - Na carga, faz `fetch('dados/reserva.json')` e `fetch('dados/projetos.json')`.
  - Depois chama `lerTriagem({ buscar: fetch, reserva })` e `pintarNumeros`.
  - Qualquer erro mantém os valores iniciais do HTML.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS 3/3. Depois, `npm run test:e2e`, todo verde.
- [ ] **Step 5:** Commit `feat: números da triagem ao vivo com reserva datada`.

---

### Task 5: Português e inglês

**Files:**
- Create: `js/i18n.js`, `testes/unit/i18n.test.js`, `testes/e2e/idioma.spec.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `pintarNumeros` (Task 4) e os atributos `data-i18n` (Task 3).
- Produces (`js/i18n.js`):
  - `TEXTOS = { pt: {chave: texto}, en: {chave: texto} }`
  - `escolherLingua(salva, navegador) -> "pt" | "en"`: vale a salva se existir. Senão, `"en"` se `navegador` não começar com `pt`, e `"pt"` caso contrário.
  - `aplicarTextos(doc, lingua)`: troca o `textContent` de cada `[data-i18n]`, o `lang` do `<html>`, o `href` de `#baixar-cv` (`cv/luiz-souto-cv-<lingua>.pdf`) e o `aria-pressed` dos botões.

- [ ] **Step 1: Escrever os testes unitários que falham** em `testes/unit/i18n.test.js`:
  - `"pt e en têm as mesmas chaves"`;
  - `"nenhum texto vazio"`;
  - `"escolherLingua"`: `(null,"pt-BR")→"pt"`, `(null,"en-US")→"en"`, `("pt","en-US")→"pt"`.
- [ ] **Step 2: Escrever os testes e2e que falham** em `testes/e2e/idioma.spec.js`:
  - `"troca para EN e volta"`: depois de clicar `EN`, o `h1` fica "QA who builds AI tools. And ships them.", `html[lang]` vira `en` e `#baixar-cv` aponta para `-en.pdf`.
  - `"números mudam de formato no EN"`: com a rota ao vivo em `horasEconomizadas: 1.9485`, o `[data-num="horasTriagem"]` mostra `1,9` em PT e `1.9` em EN.
  - `"funciona com localStorage bloqueado"`: um `addInitScript` faz `localStorage.getItem/setItem` lançarem erro. A troca para EN funciona e o console não mostra erro sem tratamento.
  - `"todas as chaves da página existem em TEXTOS"`: todo `data-i18n` da página tem chave em `pt` e em `en`.
- [ ] **Step 3:** Rodar `npm test && npm run test:e2e`. Esperado: FAIL nos novos.
- [ ] **Step 4:** Implementar `js/i18n.js` com os textos em PT, iguais ao HTML, e a tradução para EN.
  - Os rótulos de estimativa também são traduzidos, por exemplo "owner's estimate: ~30 min per order × 8 orders/week".
  - Em `app.js`: os botões `[data-lingua]` chamam `aplicarTextos` e `pintarNumeros`, e salvam a escolha em `localStorage` com `try/catch`.
- [ ] **Step 5:** Rodar `npm test && npm run test:e2e`. Esperado: tudo PASS.
- [ ] **Step 6:** Commit `feat: versão em inglês`.

---

### Task 6: CV para as vagas do iFood (PT e EN)

**Files:**
- Create: `cv/cv-pt.html`, `cv/cv-en.html`, `cv/cv.css`, `scripts/gerar-cv.mjs`, `testes/unit/cv.test.js`, `cv/luiz-souto-cv-pt.pdf`, `cv/luiz-souto-cv-en.pdf`

**Interfaces:**
- Consumes: os números de `dados/reserva.json` e `dados/projetos.json`, escritos no HTML do CV com a data da reserva. O link `#baixar-cv` vem da Task 5.
- Produces: os dois PDFs nos caminhos acima.

- [ ] **Step 1: Escrever os testes que falham** em `testes/unit/cv.test.js`. O texto dos PDFs é extraído com o Playwright: o script grava um `.txt` ao lado de cada PDF, a partir do `innerText` do HTML renderizado, e o teste lê esse `.txt`.
  - `"existem os dois PDFs com no máximo 2 páginas"`: conta `/Type /Page[^s]` no binário. Esperado: entre 1 e 2.
  - `"CV traz os projetos com IA antes da experiência"`: no texto, a posição de `Projetos com IA` vem antes de `Experiência` (no EN, `AI Projects` antes de `Experience`).
  - `"CV traz a FIAP com status permitido"`: o texto contém `FIAP` e `Inteligência Artificial`. O status é um destes: `matriculado` ou `cursando`. `cursando` só é aceito se a constante `AULAS_COMECARAM` em `scripts/gerar-cv.mjs` for `true`.
  - `"CV traz os links dos projetos"`: contém `github.com/luizhenrisouto/triagem-de-falhas-ia` e `luizhenrisouto.github.io`.
  - `"CV sem termos vetados e sem telefone"`: mesma regra da Task 3, aplicada ao texto dos dois PDFs.
  - `"rótulos de estimativa no CV"`: contém `estimativa` no PT e `estimate` no EN.
- [ ] **Step 2:** Rodar `npx vitest run testes/unit/cv.test.js`. Esperado: FAIL, porque os PDFs não existem.
- [ ] **Step 3: Confirmar o status da FIAP com o usuário** (matrícula feita? mês e ano de início?) e se o e-mail entra. Gravar as respostas no topo de `scripts/gerar-cv.mjs` como `STATUS_FIAP`, `AULAS_COMECARAM` e `EMAIL` (ou `null`).
- [ ] **Step 4:** Escrever `cv/cv-pt.html` e `cv/cv-en.html`, só com fatos do CV original e dos repositórios. Ordem:
  1. Nome, título "QA Sênior · Ferramentas com IA", Porto Alegre, links (GitHub, LinkedIn, site) e e-mail se confirmado.
  2. Resumo de 3 linhas.
  3. Projetos com IA:
     - **Triagem:** n8n, Gemini/Claude, GitHub Actions, evals contra gabarito, números com data e rótulos.
     - **Mater:** Supabase, Mercado Pago, extração de pedidos com IA, mais de N testes, 4 h/semana com o rótulo de estimativa, "em implantação".
  4. Experiência por setor, com o uso de IA no fluxo de QA em destaque.
  5. Ferramentas.
  6. Formação: FIAP com o status, QI técnico (2015–2016) e ADS na Unisinos (trancado).
  7. Idiomas.
  
  O `cv/cv.css` é claro, numa coluna, com acento `#5b8cff` discreto, formato A4 e `@page { margin: 14mm }`.
- [ ] **Step 5:** Implementar `scripts/gerar-cv.mjs`.
  - Usa `chromium` do `@playwright/test`.
  - Abre cada HTML via `file://`, gera `page.pdf({ format: "A4", printBackground: true })` e grava o `.txt` do `innerText`.
  - Script npm `"cv": "node scripts/gerar-cv.mjs"`.
  - Os `.txt` vão para o `.gitignore`.
- [ ] **Step 6:** Rodar `npm run cv && npx vitest run testes/unit/cv.test.js`. Esperado: PASS 6/6.
- [ ] **Step 7:** Abrir os PDFs e revisar leitura e quebras de página. Enviar ao usuário para revisão (SendUserFile).
- [ ] **Step 8:** Commit `feat: CV para as vagas de GenAI do iFood (PT/EN)`.

---

### Task 7: README e preparação da publicação

**Files:**
- Create: `README.md`

- [ ] **Step 1:** Escrever o `README.md`:
  - o que é o site;
  - como rodar local (`node scripts/servir.mjs`);
  - testes (`npm test`, `npm run test:e2e`);
  - como atualizar a reserva (`node scripts/atualizar-reserva.mjs`) e o CV (`npm run cv`);
  - o aviso de que `testes/vetados.local.json` é local e obrigatório.
- [ ] **Step 2:** Rodar a suíte completa: `npm test && npm run test:e2e`. Esperado: tudo PASS.
- [ ] **Step 3:** Commit `docs: README`.
- [ ] **Step 4 (com o usuário, não automático):** Parar e combinar com o usuário a criação do repositório `luizhenrisouto.github.io`, o push e a ativação do GitHub Pages. Antes, conferir com `git ls-files` que `testes/vetados.local.json` e `.superpowers/` não estão versionados.
