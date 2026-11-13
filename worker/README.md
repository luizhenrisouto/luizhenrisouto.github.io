# Triagem ao vivo: Cloudflare Worker

Servidor pequeno que recebe o erro colado no laboratório do portfólio, confere a origem, o tamanho e os limites de uso, e pergunta ao Gemini (`gemini-3.5-flash-lite`) se é bug do produto, teste instável ou teste quebrado.

- **Rota:** `POST /triagem` com `{ erro, codigo?, lingua }`.
- **Limites:** 5 análises por pessoa por dia e 200 no total por dia, contadas no Workers KV. A pessoa é identificada por um hash de IP com sal; o IP nunca é gravado. A contagem do KV é **aproximada**: pedidos simultâneos podem passar um pouco do limite. Isso não gera custo, porque a cota grátis do Gemini é o teto real. Se o KV recusar uma escrita, o Worker não chama a IA.
- **Privacidade:** o texto recebido e a resposta não vão para log.
- **Código:** `src/gemini.js` (pedido e leitura), `src/limites.js`, `src/triagem.js` (a rota) e `src/index.js` (entrada). Os testes ficam em `testes/unit/worker-*.test.js`, na raiz do site.

## Publicar (feito pelo dono; ninguém mais digita ou vê as chaves)

1. **Conta:** criar uma conta gratuita em dash.cloudflare.com.
2. **Chave do Gemini, só para o portfólio:** em aistudio.google.com → **Get API key → Create API key**, num projeto separado (por exemplo `portfolio-triagem`). Com uma chave própria, dá para revogá-la sem afetar a triagem do CI.
3. **Login**, na pasta `worker/`:
   ```bash
   npx wrangler login
   ```
4. **Criar o KV dos limites:**
   ```bash
   npx wrangler kv namespace create LIMITES
   ```
   Copiar o `id` que aparece para o lugar de `PREENCHER_NO_DEPLOY` no `wrangler.toml`. O `id` não é segredo.
5. **Gravar os segredos.** Cada comando pede o valor, que tu digitas ou colas:
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```
   ```bash
   npx wrangler secret put SAL
   ```
   Para o `SAL`, usar um texto aleatório longo, por exemplo gerado no gerenciador de senhas.
6. **Publicar:**
   ```bash
   npx wrangler deploy
   ```
   O comando mostra o endereço, algo como `https://triagem-ao-vivo.SEU-SUBDOMINIO.workers.dev`.
7. **Apontar o site para o Worker:** em `js/laboratorio.js`, trocar `URL_TRIAGEM_VIVO` pelo endereço acima, terminado em `/triagem`. Enquanto ela estiver vazia, o botão "Analisar" fica desligado e a página mostra "análise ao vivo em breve": nada é enviado a lugar nenhum.
8. **Gerar os exemplos** (4 falhas × PT/EN = 8 chamadas ao Gemini), na raiz do site, com a chave só no terminal (PowerShell):
   ```powershell
   $env:GEMINI_API_KEY = "cole-a-chave-aqui"; node scripts/gerar-exemplos-triagem.mjs; Remove-Item Env:GEMINI_API_KEY
   ```
   O script grava `dados/exemplos-triagem.json` e mostra ✓/✗ de cada exemplo contra o gabarito.
9. **Testar** tudo: `npm test` e `npm run test:e2e`.
10. **Conferir no ar:** publicar o site, abrir o laboratório, clicar num exemplo e fazer uma análise colando um erro.

## Limites do lado do Google (recomendado)
Em aistudio.google.com, no projeto da chave:
- conferir a cota do plano gratuito em **Usage / Rate limits**;
- se o projeto tiver faturamento, definir um teto de gasto em **Billing → Budgets & alerts** do Google Cloud.

O plano gratuito não cobra; quando a cota acaba, as chamadas são recusadas e o site mostra "A IA não respondeu agora".

## Revogar a chave
Em aistudio.google.com → **API keys**, apagar a chave. Depois, criar outra e repetir o passo 5 só para `GEMINI_API_KEY`.

## Atualizar o prompt
O prompt está em `src/gemini.js`. Ao mudar, rodar os testes, publicar de novo (`npx wrangler deploy`) e gerar os exemplos de novo (passo 8), para os exemplos refletirem o prompt novo.
