# Triagem ao vivo — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seção "Laboratório" no portfólio em que o visitante testa a triagem de falhas com IA: exemplos prontos pré-calculados e análise ao vivo do texto colado, via um Cloudflare Worker que chama o Gemini.

**Architecture:**
- **Worker (`worker/`):** guarda a chave, confere a origem, o tamanho e os limites (Workers KV) e chama o Gemini com o prompt e o esquema da triagem. Toda a lógica é JS puro com dependências injetadas, testada com Vitest, sem Cloudflare.
- **Site:** ganha `js/laboratorio.js`, que mostra os exemplos lidos de `dados/exemplos-triagem.json` e chama o Worker para o texto colado.
- **Script local:** gera os exemplos chamando o Gemini direto, com o mesmo módulo do Worker.

**Tech Stack:** JS (ES modules), Cloudflare Workers + KV + `wrangler`, Gemini API (`gemini-3.5-flash-lite`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-triagem-ao-vivo-design.md`

## Global Constraints

- **Modelo:** `gemini-3.5-flash-lite`. **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/<modelo>:generateContent`, com a chave no cabeçalho `x-goog-api-key`.
- **Rota:** `POST /triagem` com `{ erro, codigo?, lingua: "pt"|"en" }`. `OPTIONS` responde ao CORS. Qualquer outra rota responde 404.
- **Origens aceitas:** variável `ORIGENS` do Worker, separada por vírgula: `https://luizhenrisouto.github.io,http://127.0.0.1:4180`.
- **Tamanhos:** `erro` de 20 a 4000 caracteres (depois de `trim`); `codigo` até 2000.
- **Limites:** 5 por pessoa por dia e 200 no geral por dia. O dia é contado no fuso `America/Sao_Paulo`.
  - Chaves no KV (binding `LIMITES`): `p:<hash>:<dia>` e `g:<dia>`, com expiração de 172800 s.
  - `<hash>` = SHA-256 hex de `SAL + ip + dia` (`SAL` é um segredo do Worker). O IP vem do cabeçalho `CF-Connecting-IP`.
- **A tentativa conta assim que o pedido é válido,** mesmo se o Gemini falhar. Isso evita abuso.
- **Códigos de erro:** `origem` 403, `texto_curto` 400, `texto_longo` 400, `limite_pessoa` 429, `limite_geral` 429, `ia_indisponivel` 502, `resposta_invalida` 502. **Corpo:** `{ erro, mensagem, restantes? }`, com a mensagem na língua pedida.
- **Sucesso:** `200 { triagem, restantes }`. `triagem` segue o `ESQUEMA_TRIAGEM` da triagem (categoria em `bug_produto|teste_instavel|teste_quebrado`).
- **Tempo:** limite de 25 s na chamada ao Gemini (Worker) e 30 s no navegador.
- **Nada do texto recebido ou da resposta vai para `console.log`.**
- **Rótulo do acerto (PT):** "Acerto da mesma IA na triagem do CI, que também recebe o print da tela: N% em M falhas · suíte de demonstração com gabarito".
- **Aviso (PT):** "Não cole dados confidenciais: a análise usa o Gemini no plano gratuito."
- **Renderização:** todo texto vindo da IA vai para o DOM por `textContent`, nunca por `innerHTML`.
- **Site:** estático no GitHub Pages; seção `#laboratorio` entre `#projetos` e `#como-testo`; PT/EN pelo `i18n.js`; 360 px sem rolagem lateral; movimento reduzido respeitado.
- **Segredos:** `GEMINI_API_KEY` e `SAL` entram por `wrangler secret put`, digitados pelo usuário. Nada de segredo em arquivo versionado.
- **Commits** com `Luiz Henri Souto <luizhenrisouto@users.noreply.github.com>`. **Sem push nem deploy sem o usuário.**

## Review Focus

1. **Texto colado enorme** (mais de 4000 caracteres): o navegador recusa antes de chamar a rede, com a mensagem de tamanho. Teste na Task 5.
2. **Worker lento ou fora do ar:** o carregamento para em até 30 s com uma mensagem, e os exemplos continuam funcionando. Teste na Task 5.
3. **Clique duplo em "Analisar":** sai uma chamada só, porque o botão fica desabilitado durante a análise. Teste na Task 5.
4. **Texto malicioso na resposta da IA** (por exemplo `<img src=x onerror=alert(1)>` no `resumo`): aparece como texto e nada é executado. Testes na Task 1 (o esquema só aceita os campos definidos) e na Task 4 (renderização por `textContent`).
5. **Troca de idioma com um resultado na tela:** o resultado de exemplo troca para a outra língua. O resultado ao vivo fica na língua em que foi gerado, com a nota "gerado em português" / "generated in English". Teste na Task 5.

---

## Estrutura de arquivos

```
worker/
  src/gemini.js        prompt + esquema + montarPedido + lerResposta (compartilhado com o script)
  src/limites.js       dia em São Paulo, hash, contar e checar limites no KV
  src/triagem.js       tratar(req, env, deps): origem, CORS, validação, limites, chamada, respostas
  src/index.js         export default { fetch } ligando triagem.js ao ambiente real
  wrangler.toml        nome, compatibilidade, binding KV, var ORIGENS
js/laboratorio.js      UI: exemplos, análise ao vivo, resultado, estados de erro
dados/falhas-exemplo.json   textos das 4 falhas (sem resposta), da suíte de demonstração
dados/exemplos-triagem.json falhas + respostas PT/EN + acertou (gerado pelo script)
scripts/gerar-exemplos-triagem.mjs
testes/unit/worker-gemini.test.js, worker-limites.test.js, worker-triagem.test.js, exemplos.test.js
testes/e2e/laboratorio.spec.js
testes/e2e/fixtures/exemplos-triagem.json   exemplos falsos para os testes
```

---

### Task 1: Módulo do Gemini (prompt, esquema, pedido e leitura da resposta)

**Files:**
- Create: `worker/src/gemini.js`
- Test: `testes/unit/worker-gemini.test.js`

**Interfaces:**
- Produces (`worker/src/gemini.js`):
  - `MODELO = "gemini-3.5-flash-lite"`
  - `CATEGORIAS = ["bug_produto","teste_instavel","teste_quebrado"]`
  - `ESQUEMA_TRIAGEM`: cópia do esquema de `triagem-de-falhas-ia/n8n/codigo/triagem-comum.js`.
  - `montarPedido({ erro, codigo, lingua }) -> object`: o corpo do `generateContent`.
  - `lerResposta(json) -> { triagem } | { erro: "resposta_invalida" }`
  - `chamarGemini({ chave, pedido, buscar, limiteMs }) -> Promise<{ triagem } | { erro: "ia_indisponivel" | "resposta_invalida" }>`

- [ ] **Step 1: Escrever os testes que falham:**
  - `"montarPedido usa o prompt da triagem, o esquema e a língua"`:
    - `systemInstruction.parts[0].text` contém "analista de QA sênior" e, para `lingua: "en"`, contém "Answer in English";
    - `generationConfig.responseMimeType === "application/json"` e `responseJsonSchema === ESQUEMA_TRIAGEM`;
    - o texto do usuário contém o erro e "Trecho do código do teste:" com o código, ou "(não informado)" sem ele.
  - `"lerResposta aceita uma triagem válida"`, usando a fixture `{ candidates:[{ finishReason:"STOP", content:{ parts:[{ text: JSON válido }] } }] }`.
  - `"lerResposta recusa JSON inválido, categoria fora da lista, finishReason diferente de STOP e resposta sem candidato"`: todos devolvem `{ erro: "resposta_invalida" }`.
  - `"lerResposta ignora partes de pensamento (thought: true)"`.
  - `"lerResposta descarta campos extras e força tipos"`: campos que não estão no esquema não passam, e `confianca` fica limitada a 0..1.
  - `"chamarGemini devolve ia_indisponivel em erro HTTP, exceção de rede e tempo esgotado"`, com um `buscar` falso que responde 503, lança erro ou demora mais que `limiteMs: 50`.
  - `"chamarGemini envia a chave no cabeçalho x-goog-api-key e nunca na URL"`.
- [ ] **Step 2:** `npx vitest run testes/unit/worker-gemini.test.js`. Esperado: FAIL, porque o módulo não existe.
- [ ] **Step 3: Implementar.**
  - O prompt é o texto de `triagem-de-falhas-ia/prompts/triagem.md`, adaptado:
    - a entrada é só "a mensagem de erro e o stack colados por quem está testando, e às vezes um trecho do teste";
    - sem print e sem dados de tentativas: "quando faltar evidência, diga isso em `causaProvavel` e baixe a `confianca`";
    - a última linha depende da língua: "Responda em português do Brasil." / "Answer in English."
  - O tempo-limite usa `AbortController`.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS em todos os testes.
- [ ] **Step 5:** Commit `feat(worker): pedido e leitura do Gemini para a triagem ao vivo`.

---

### Task 2: Limites de uso

**Files:**
- Create: `worker/src/limites.js`
- Test: `testes/unit/worker-limites.test.js`

**Interfaces:**
- Produces:
  - `diaSaoPaulo(agora: Date) -> "AAAA-MM-DD"`
  - `hashPessoa(ip, sal, dia) -> Promise<string>`: SHA-256 hex via `crypto.subtle`.
  - `registrarUso({ kv, ip, sal, agora }) -> Promise<{ ok: true, restantes } | { ok: false, erro: "limite_pessoa"|"limite_geral", restantes: 0 }>`
  - `POR_PESSOA = 5`, `GERAL = 200`

- [ ] **Step 1: Escrever os testes que falham,** com um KV falso (`Map` com `get` e `put(chave, valor, { expirationTtl })`):
  - `"o dia vira à meia-noite de São Paulo"`: `2026-11-14T02:59:00Z` dá `2026-11-13`, e `03:00Z` dá `2026-11-14`.
  - `"5 usos passam e o 6º é recusado"`: os `restantes` vão de 4 até 0, e o 6º devolve `limite_pessoa`.
  - `"outra pessoa não é afetada"`.
  - `"limite geral de 200"`: com `g:<dia>` em `"200"`, devolve `limite_geral`.
  - `"no dia seguinte zera"`.
  - `"guarda hash, nunca o IP"`: nenhuma chave gravada contém `"203.0.113.9"`.
  - `"grava com expiração de 172800 s"`.
- [ ] **Step 2:** `npx vitest run testes/unit/worker-limites.test.js`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Lê os dois contadores, recusa se algum estourou, senão grava os dois com +1. Ruling aceito: a contagem do KV é aproximada.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit `feat(worker): limites de uso por pessoa e por dia`.

---

### Task 3: Rota do Worker

**Files:**
- Create: `worker/src/triagem.js`, `worker/src/index.js`, `worker/wrangler.toml`
- Test: `testes/unit/worker-triagem.test.js`

**Interfaces:**
- Consumes: `montarPedido`, `chamarGemini` (Task 1) e `registrarUso` (Task 2).
- Produces:
  - `tratar(req: Request, env: { GEMINI_API_KEY, SAL, ORIGENS, LIMITES }, deps: { buscar, agora }) -> Promise<Response>`
  - `index.js`: `export default { fetch: (req, env) => tratar(req, env, { buscar: fetch, agora: () => new Date() }) }`
  - `wrangler.toml`:
    - `name = "triagem-ao-vivo"`, `main = "src/index.js"`, `compatibility_date = "2026-11-01"`;
    - `[vars] ORIGENS = "https://luizhenrisouto.github.io,http://127.0.0.1:4180"`;
    - `[[kv_namespaces]] binding = "LIMITES"`, com `id = "PREENCHER_NO_DEPLOY"`.

- [ ] **Step 1: Escrever os testes que falham,** chamando `tratar` com `new Request(...)` e um `buscar` falso do Gemini:
  - `"OPTIONS de origem aceita responde 204 com Access-Control-Allow-Origin igual à origem e Vary: Origin"`.
  - `"origem fora da lista responde 403 origem"`, e também sem o cabeçalho `Origin`.
  - `"rota ou método diferente responde 404"`.
  - `"erro com menos de 20 caracteres → 400 texto_curto; com mais de 4000 → 400 texto_longo; codigo com mais de 2000 → 400 texto_longo"`. Nenhum desses chama o Gemini nem conta uso.
  - `"JSON inválido no corpo → 400 texto_curto"`.
  - `"sucesso → 200 { triagem, restantes: 4 } com CORS"`.
  - `"6º uso → 429 limite_pessoa com restantes 0, sem chamar o Gemini"`.
  - `"Gemini fora → 502 ia_indisponivel com restantes, e o uso conta"`.
  - `"mensagens de erro em inglês quando lingua = en"`.
  - `"nada do texto enviado aparece no console"`: espiona `console.log/error/warn` e confirma que nenhuma chamada contém o texto de `erro`.
- [ ] **Step 2:** `npx vitest run testes/unit/worker-triagem.test.js`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** As mensagens em PT e EN de cada código ficam num objeto dentro de `triagem.js`.
- [ ] **Step 4:** Rodar o mesmo comando. Depois `npm test`, tudo verde.
- [ ] **Step 5:** Commit `feat(worker): rota POST /triagem com origem, tamanhos e limites`.

---

### Task 4: Exemplos (textos, gerador e visual da seção)

**Files:**
- Create:
  - `dados/falhas-exemplo.json`
  - `scripts/gerar-exemplos-triagem.mjs`
  - `testes/unit/exemplos.test.js`
  - `testes/e2e/fixtures/exemplos-triagem.json`
  - `js/laboratorio.js` (parte dos exemplos)
  - `testes/e2e/laboratorio.spec.js`
- Modify: `index.html` (seção `#laboratorio` e item no menu), `css/estilo.css`, `js/i18n.js`, `js/app.js` (chama `iniciarLaboratorio`), `testes/e2e/pagina.spec.js` (ordem das seções).

**Interfaces:**
- Consumes: `montarPedido`, `chamarGemini`, `CATEGORIAS` (Task 1).
- Produces:
  - **`dados/falhas-exemplo.json`:** `[{ id, rotulo: { pt, en }, gabarito, erro, codigo }]`, com 4 itens.
  - **`dados/exemplos-triagem.json`:** `{ geradoEm, modelo, exemplos: [{ id, rotulo, gabarito, erro, codigo, respostas: { pt: triagem, en: triagem }, acertou: { pt: bool, en: bool } }] }`
  - **`scripts/gerar-exemplos-triagem.mjs`:** exporta `gerarExemplos({ falhas, chave, buscar, agora }) -> Promise<objeto do arquivo>`. Quando executado direto, lê `GEMINI_API_KEY` do ambiente e grava o arquivo.
  - **`js/laboratorio.js`:**
    - `iniciarLaboratorio(doc, { exemplos, triagem, lingua })`;
    - `mostrarResultado(doc, { triagem, gabarito?, acertou?, linguaGerada? })`;
    - `trocarLinguaLaboratorio(doc, lingua)`.

- [ ] **Step 1: Textos dos exemplos.**
  - Rodar a suíte de demonstração em `C:\Users\00783_luiz\portfolio\triagem-de-falhas-ia` (`npx playwright test`) e extrair do `relatorios/resultado.json` a mensagem de erro e o stack de 4 falhas: **2 `bug_produto`, 1 `teste_instavel` e 1 `teste_quebrado`**, conforme `testes/gabarito.json`. O `codigo` é o trecho do teste ao redor da linha (até 15 linhas).
  - Trocar qualquer caminho absoluto da máquina pelo caminho relativo do repositório.
  - Gravar em `dados/falhas-exemplo.json`, com rótulos curtos em PT e EN.
- [ ] **Step 2: Escrever os testes unitários que falham** (`testes/unit/exemplos.test.js`):
  - `"falhas-exemplo tem 4 itens, cobre as 3 categorias e nenhum caminho absoluto"`: nenhum `erro` nem `codigo` casa com `/[A-Za-z]:\\|\/Users\/|\/home\//`.
  - `"gerarExemplos chama o Gemini 8 vezes (4 falhas × 2 línguas) e calcula acertou comparando com o gabarito"`, com um `buscar` falso.
  - `"gerarExemplos falha alto se faltar a chave"`: lança erro com a mensagem "GEMINI_API_KEY".
  - `"gerarExemplos falha alto se alguma resposta vier inválida"`: não grava um arquivo pela metade.
- [ ] **Step 3: Escrever os testes e2e que falham** (`testes/e2e/laboratorio.spec.js`). A rota `**/dados/exemplos-triagem.json` responde com a fixture:
  - `"seção laboratório entre projetos e como-testo"`: atualizar o teste de ordem em `pagina.spec.js` para `["topo","projetos","laboratorio","como-testo","trajetoria","ferramentas","contato"]`.
  - `"clicar num exemplo mostra o resultado sem chamar o Worker"`:
    - o selo da categoria, o resumo e "gabarito: … ✓" aparecem;
    - `page.on("request")` não vê nenhuma chamada a `workers.dev`.
  - `"exemplo com acertou=false mostra ✗"`.
  - `"texto malicioso na resposta aparece como texto"`: a fixture tem `resumo: "<img src=x onerror=window.__x=1>"`. O texto aparece literal, `window.__x` continua `undefined` e não existe `img` dentro do cartão.
  - `"troca de idioma troca a resposta do exemplo"`.
  - `"360px sem rolagem lateral com um resultado aberto"`.
- [ ] **Step 4:** `npm test && npm run test:e2e`. Esperado: FAIL nos testes novos.
- [ ] **Step 5: Implementar.**
  - O gerador usa `montarPedido` e `chamarGemini` da Task 1.
  - A seção tem título, apoio, aviso, botões de exemplo, a caixa de texto e o botão (a análise ao vivo entra na Task 5), o cartão de resultado e a coluna do acerto.
  - Cores por categoria: bug = `#ff8a7a`, instável = `#ffcf4a`, quebrado = `#5b8cff`.
  - Barra de confiança em largura proporcional.
  - Os cartões da seção recebem o brilho do mouse (`.brilho`).
  - Textos novos em `i18n.js`, com PT idêntico ao do HTML.
- [ ] **Step 6:** `npm test && npm run test:e2e`. Esperado: tudo PASS.
- [ ] **Step 7:** Commit `feat: laboratório com exemplos da triagem`.

---

### Task 5: Análise ao vivo no navegador

**Files:**
- Modify: `js/laboratorio.js`, `index.html`, `js/i18n.js`, `testes/e2e/laboratorio.spec.js`

**Interfaces:**
- Consumes: o contrato do Worker (Global Constraints) e `lerTriagem`/`pintarNumeros` do site.
- Produces:
  - `URL_TRIAGEM_VIVO = "https://triagem-ao-vivo.PREENCHER.workers.dev/triagem"` em `js/laboratorio.js`, preenchida no deploy;
  - `analisarAoVivo(doc, { buscar, lingua }) -> Promise<void>`.

- [ ] **Step 1: Escrever os testes e2e que falham,** com a rota `URL_TRIAGEM_VIVO` simulada:
  - `"análise ao vivo mostra o cartão e 'restam 4 hoje'"`.
  - `"antes da primeira análise mostra 'até 5 análises por dia'"`.
  - `"texto com mais de 4000 caracteres é recusado sem chamar a rede"`.
  - `"texto curto (menos de 20) é recusado sem chamar a rede"`.
  - `"429 limite_pessoa mostra a mensagem e 'os exemplos continuam funcionando'"`.
  - `"Worker fora do ar (route.abort) mostra o erro em até 30 s e os exemplos seguem funcionando"`. Usar `page.clock` ou um limite configurável para não esperar 30 s de verdade.
  - `"clique duplo faz uma chamada só"`: conta as requisições e o botão fica `disabled` durante a análise.
  - `"resultado ao vivo mantém a língua em que foi gerado ao trocar de idioma, com a nota"`.
  - `"rótulo do acerto mostra o texto da Global Constraints com os números do indice.json"`.
- [ ] **Step 2:** `npm run test:e2e`. Esperado: FAIL nos novos.
- [ ] **Step 3: Implementar.**
  - Validação de tamanho no cliente, com as mesmas regras do Worker.
  - Botão desabilitado durante a análise.
  - `AbortController` com 30 s.
  - Os erros mapeiam os códigos do Worker para mensagens do `i18n.js`.
  - A nota de língua aparece quando `linguaGerada !== lingua`.
- [ ] **Step 4:** `npm test && npm run test:e2e`. Esperado: tudo PASS.
- [ ] **Step 5:** Tirar capturas em 1280 px e 375 px (exemplo aberto e erro de limite) e revisar o visual.
- [ ] **Step 6:** Commit `feat: análise ao vivo no laboratório`.

---

### Task 6: README e roteiro de publicação

**Files:**
- Modify: `README.md`
- Create: `worker/README.md`

- [ ] **Step 1:** Em `worker/README.md`, o passo a passo do usuário. O Claude não vê nem digita chaves.
  1. Criar a conta grátis na Cloudflare.
  2. `npx wrangler login`.
  3. `npx wrangler kv namespace create LIMITES` e colar o `id` no `wrangler.toml`.
  4. `npx wrangler secret put GEMINI_API_KEY`, com uma chave nova, só do portfólio.
  5. `npx wrangler secret put SAL`, com um texto aleatório longo.
  6. `npx wrangler deploy`.
  7. Copiar a URL `*.workers.dev` para `URL_TRIAGEM_VIVO`.
  8. Gerar os exemplos com `GEMINI_API_KEY` no ambiente do terminal: `node scripts/gerar-exemplos-triagem.mjs`.
  9. `npm test && npm run test:e2e`.
  10. Commit e publicação do site.

  Inclui também como pôr um limite de gasto ou de cota no Google AI Studio, e como revogar a chave.
- [ ] **Step 2:** No `README.md`, uma linha sobre o laboratório e o link para `worker/README.md`.
- [ ] **Step 3:** `npm test && npm run test:e2e`. Esperado: tudo PASS.
- [ ] **Step 4:** Commit `docs: publicação da triagem ao vivo`.
- [ ] **Step 5 (com o usuário, não automático):** seguir `worker/README.md` e, depois, a revisão final e a publicação.
