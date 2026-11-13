# Triagem ao vivo no portfólio — desenho

**Data:** 2026-11-13
**Repositório:** `luizhenrisouto/luizhenrisouto.github.io` (pasta `C:\Users\00783_luiz\portfolio\site-pessoal`)
**Projeto de origem:** `luizhenrisouto/triagem-de-falhas-ia` (pasta `C:\Users\00783_luiz\portfolio\triagem-de-falhas-ia`)

## Para que serve

Deixar quem avalia o portfólio (recrutador ou líder técnico do iFood, trilha AI Engineer) **testar a IA do Luiz na hora, sem instalar nada**:
1. A pessoa cola o erro de um teste automatizado que falhou, ou clica num exemplo pronto.
2. Em segundos, a IA diz se é **bug do produto, teste instável ou teste quebrado**, com a explicação, os passos para reproduzir e a sugestão de correção.
3. Ao lado, aparece o **acerto medido contra o gabarito** da triagem que roda todo dia.

Isso prova a frase do portfólio ("QA que constrói ferramentas com IA que funcionam de verdade") com o próprio visitante como testemunha, e mostra o diferencial de QA: **a IA é medida, não aceita no escuro**.

## Objetivos

- Uma seção nova, **"Laboratório"**, logo depois de "Projetos", com a ferramenta funcionando em PT e EN.
- **Exemplos prontos que nunca falham:** respostas pré-calculadas e gravadas no site, que funcionam sem servidor, sem custo e mesmo se a IA estiver fora do ar.
- **IA ao vivo** para o texto que a pessoa colar, via Gemini no plano gratuito.
- O mesmo prompt e a mesma estrutura de resposta da triagem que já roda no CI, para que o acerto mostrado ao lado se refira ao mesmo "cérebro".

## Não-objetivos

- Não analisa print de tela nem lê relatórios inteiros: só o texto colado de uma falha.
- Não guarda o que a pessoa colou.
- Não abre issue em lugar nenhum.
- Não é o gerador de cenários BDD (será o próximo projeto, em Python).

## Anti-objetivos: fracasso mesmo funcionando

- **Chave da IA exposta** no navegador ou no repositório público.
- **Conta estourada:** alguém, ou um robô, usando a IA sem limite.
- **Promessa que não se cumpre:** o recrutador clica e a ferramenta falha, fica carregando para sempre ou devolve lixo. Por isso os exemplos não dependem do servidor.
- **Dados sensíveis:** o Gemini grátis pode usar o que é enviado para treinar modelos. A página avisa "não cole dados confidenciais", e o servidor não registra o conteúdo.
- **Número inflado:** o acerto mostrado é o medido no CI (`acertoMedioPct` do `indice.json`), rotulado como "suíte de demonstração com gabarito". Nunca um número calculado a partir dos exemplos.
- **Parecer cópia** do portfólio de referência (qa-ai-playground): nada de "Smart Data Mock", "BDD Generator" ou "API Contract Check".

## Restrições

- O site continua estático no GitHub Pages: HTML, CSS e JS puros, sem build. Segue o visual atual (azul elétrico, Geist).
- **A IA é o Gemini no plano gratuito** (decisão do usuário), com o modelo `gemini-3.5-flash-lite`, o mesmo da triagem. Trocar para o Claude depois deve ser só configuração, porque o código da triagem já suporta os dois.
- **O servidor é um Cloudflare Worker gratuito** (decisão do usuário, abordagem A). O código fica no repositório público, sem segredos. A chave entra com `wrangler secret put GEMINI_API_KEY`, digitada pelo usuário.
- O usuário cria a conta da Cloudflare e faz o login do `wrangler`. Publicar o Worker e o site é feito com ele.
- Commits com `Luiz Henri Souto <luizhenrisouto@users.noreply.github.com>`. Nada de nomes de empregador nem de dados de clientes; o teste de termos vetados continua valendo.
- `prefers-reduced-motion` respeitado e legível no celular (360 px sem rolagem lateral).

## Abordagens consideradas

| | Abordagem | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | **Cloudflare Worker com a chave + exemplos pré-calculados no site** | O recrutador testa com o erro dele; os exemplos funcionam sempre; chave protegida; grátis | Uma conta e um lugar a mais para publicar |
| B | Só exemplos pré-calculados | Zero risco, pronto em meio dia | Sem "ao vivo": o visitante não testa o caso dele |
| C | Visitante usa a própria chave do Gemini | Zero custo e risco | Na prática ninguém testaria |

Descartadas também: o servidor da Mater (Supabase), para não misturar com a cliente, e migrar o site para Netlify ou Vercel.

## Como funciona

### Fluxo
```
[Site no GitHub Pages]
  ├─ exemplo clicado → resposta lida de dados/exemplos-triagem.json (sem rede)
  └─ texto colado → POST https://<worker>.workers.dev/triagem
                       ├─ confere a origem, o tamanho e o limite de usos
                       ├─ monta o pedido ao Gemini com o prompt da triagem
                       └─ devolve a triagem validada (ou um erro claro)
[Site] mostra o cartão do resultado + o acerto medido (indice.json ao vivo)
```

### O Worker (`worker/` no repositório do site)
- **Rota:** `POST /triagem` com JSON `{ erro: string, codigo?: string, lingua: "pt" | "en" }`. `OPTIONS` para CORS. Qualquer outra rota responde 404.
- **Origem:** só aceita `https://luizhenrisouto.github.io` e, em desenvolvimento, `http://127.0.0.1:4180`. A lista fica numa variável do Worker.
- **Tamanho:** `erro` obrigatório, de 20 a 4.000 caracteres; `codigo` opcional, até 2.000.
- **Limites de uso** (contadores no Workers KV, com expiração de 2 dias):
  - por pessoa: **5 análises por dia**, contadas por um hash do IP com sal, nunca o IP puro;
  - geral: **200 análises por dia**, para ficar longe da cota grátis do Gemini.

  Os contadores do KV são aproximados, e isso é aceitável aqui.
- **Pedido ao Gemini:** reaproveita o prompt de `triagem-de-falhas-ia/prompts/triagem.md`, adaptado num prompt próprio do Worker (`worker/prompt.md`):
  - a entrada é só o texto colado, sem print e sem metadados de tentativas;
  - responde em português ou inglês conforme `lingua`.

  Usa o mesmo `ESQUEMA_TRIAGEM` (saída JSON estruturada) e a mesma validação de categoria.
- **Tempo:** limite de 25 s na chamada ao Gemini.
- **Respostas de erro** sempre em JSON `{ erro: código, mensagem }`, com a mensagem na língua pedida:
  - `limite_pessoa`, `limite_geral`: 429;
  - `texto_curto`, `texto_longo`: 400;
  - `origem`: 403;
  - `ia_indisponivel`: 502;
  - `resposta_invalida`: 502.
- **Privacidade:** não registra o texto recebido nem a resposta, só contadores.

### Exemplos pré-calculados
- **Quatro falhas reais da suíte de demonstração da triagem** (SauceDemo), com o gabarito conhecido:
  - uma de cada categoria;
  - mais uma de bug do produto, por ser a mais comum.

  O texto de cada uma vem do relatório público da triagem (mensagem de erro e stack), editado só para caber.
- Um script (`scripts/gerar-exemplos-triagem.mjs`) gera as respostas dos 4 exemplos (ver a decisão 2) e grava `dados/exemplos-triagem.json` com:
  - o texto da falha;
  - a categoria do gabarito;
  - a resposta da IA;
  - a data.

  Ele roda à mão, quando o prompt mudar.
- O cartão de cada exemplo mostra **"gabarito: X" com ✓ ou ✗** conforme a IA acertou. Se errar, o ✗ aparece: é honesto, e é o ponto do projeto.

### A seção no site
- **Lugar:** nova seção `#laboratorio`, entre `#projetos` e `#como-testo`. Menu: "laboratório" / "lab".
- **Título:** "Teste a minha IA de triagem" (EN: "Try my triage AI"). Uma frase de apoio:
  > Cole o erro de um teste que falhou e veja a IA dizer se é bug, teste instável ou teste quebrado.
- **Acima da caixa:** quatro botões de exemplo, curtos ("Imagem errada no catálogo", "Tempo limite na home", ...).
- **Caixa de texto** para o erro e o stack, com contador de caracteres, mais um campo opcional "trecho do teste" recolhido.
- **Aviso:** "Não cole dados confidenciais: a análise usa o Gemini no plano gratuito."
- **Botão "Analisar"**, com estado de carregamento (pipeline animado curto, no estilo do topo).
- **Resultado num cartão:**
  - selo da categoria (cor por categoria) e barra de confiança;
  - resumo, causa provável, passos, esperado × obtido e sugestão de correção;
  - para exemplos: "gabarito: X ✓/✗".
- **Ao lado (embaixo, no celular):** "Acerto medido no CI: N% em M falhas · suíte de demonstração com gabarito", lido do `indice.json` ao vivo com a mesma reserva que o site já usa. Também mostra **quantas análises restam hoje** para o visitante.
- **Erros mostrados em linguagem simples,** sempre oferecendo os exemplos como alternativa. Exemplo: "Você usou as 5 análises de hoje. Os exemplos continuam funcionando."
- Os textos da interface têm PT e EN pelo `i18n.js` que já existe. A resposta da IA vem na língua escolhida no momento da análise.

### Testes
- **Worker (Vitest),** com o `fetch` do Gemini e o KV simulados:
  - origem recusada;
  - tamanhos;
  - limites por pessoa e geral;
  - resposta válida;
  - JSON inválido;
  - categoria fora do enum;
  - tempo esgotado;
  - erro HTTP do Gemini;
  - nenhum conteúdo enviado para log.
- **Site (Playwright),** com a rota do Worker simulada:
  - exemplo mostra o resultado sem rede;
  - análise ao vivo mostra o cartão;
  - limite atingido mostra a mensagem certa;
  - Worker fora do ar mostra o erro e mantém os exemplos;
  - troca de idioma;
  - 360 px sem rolagem lateral;
  - movimento reduzido;
  - termos vetados.

## Decisões tomadas na revisão (do autor do desenho; o usuário confere)

1. **Acerto mostrado ao lado:** o `acertoMedioPct` do `indice.json` **publicado** (nunca a cópia local, que tem dados de teste). Em 13/11/2026, as 6 execuções publicadas usam `gemini-3.5-flash-lite`, o mesmo modelo do Worker, com 100% de acerto em 24 falhas.
   - Como o CI recebe mais contexto do que o Worker (print da tela e se passou numa nova tentativa), o rótulo diz isso: **"Acerto da mesma IA na triagem do CI, que também recebe o print da tela: N% em M falhas · suíte de demonstração com gabarito"**.
   - Se um dia o CI trocar de modelo, o rótulo mostra o modelo da execução mais recente.
   - Reaproveita `lerTriagem` e a reserva que o site já tem.
2. **Exemplos nas duas línguas:** o script gera a resposta em PT e em EN (8 respostas no total) e grava as duas.
   - **Ele não passa pelo Worker:** chama o Gemini direto, reaproveitando o mesmo módulo que monta o pedido no Worker, com a chave lida da variável de ambiente `GEMINI_API_KEY` do terminal do usuário. Assim não existe nenhum "furo" no limite do Worker publicado.
   - Ao trocar de idioma, o exemplo mostra a resposta da outra língua.
   - O ✓/✗ é calculado por língua.
3. **Análises restantes:** sem rota extra.
   - Antes do primeiro uso, a página diz "até 5 análises por dia".
   - Cada resposta do Worker (sucesso ou erro de limite) traz `restantes`, e a página passa a mostrar "restam N hoje".
4. **Texto dos exemplos:** vem de uma execução local da suíte de demonstração da triagem (SauceDemo, site público de demonstração; o código dos testes é público). O texto mostrado no exemplo é exatamente o texto enviado à IA para gerar a resposta gravada, e o script grava os dois juntos.
   - Antes de gravar, o script confere que o texto não tem caminhos da máquina (por exemplo, a pasta do usuário no Windows). Se tiver, troca pelo caminho relativo do repositório.

## O que fica para quem constrói
- Os textos finais da interface em PT e EN, dentro das regras acima.
- O ícone e a cor de cada categoria, no estilo atual.
- A escolha exata das 4 falhas de exemplo e dos rótulos dos botões.
- A estrutura interna do Worker (arquivos e funções), desde que a lógica seja testável sem a Cloudflare.

## Pendências fora do código
- **O usuário:**
  - cria a conta da Cloudflare;
  - faz `npx wrangler login`;
  - cria o KV;
  - grava a chave do Gemini com `wrangler secret put`.

  A chave do Gemini pode ser a mesma da triagem ou uma nova, só para o portfólio. Uma chave separada é melhor, porque dá para revogá-la sem afetar a triagem.
- Gerar os exemplos depois do primeiro deploy do Worker.
