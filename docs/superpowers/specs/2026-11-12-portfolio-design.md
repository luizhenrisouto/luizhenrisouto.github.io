# Portfólio pessoal — desenho

**Data:** 2026-11-12
**Autor do pedido:** Luiz Henri Souto
**Pasta:** `C:\Users\00783_luiz\portfolio\site-pessoal`

## Para que serve

Convencer, em menos de um minuto, um recrutador ou líder técnico do iFood (vaga de estágio em GenAI, trilha AI Builder) de uma frase:

> **QA que constrói ferramentas com IA que funcionam de verdade. Quero esse QA atuando conosco.**

Cada elemento do site existe para provar uma parte dessa frase. O que não prova nada, sai.

## Premissa central: o recrutador não baixa nada

A prova tem que estar na própria página:
- **ferramenta rodando** num link que abre direto no navegador;
- **números concretos** de relatórios reais: horas economizadas, acerto da IA, custo, quantidade de testes;
- o código no GitHub é complemento para quem quiser aprofundar, não a prova principal.

## Objetivos

- Projetos e números aparecem antes da história pessoal.
- Visual escuro e moderno, ligado a TI. O usuário escolheu o "pipeline de CI em azul elétrico", com todos os efeitos mostrados nos esboços.
- Português e inglês, com troca no menu.
- Legível no celular.

## Não-objetivos

- Não é blog, não tem CMS nem área administrativa.
- Não tem tema claro: o modo escuro é fixo, por escolha do usuário.
- Não tem formulário de contato com servidor.

## Anti-objetivos: fracasso mesmo funcionando

- **Parecer cópia** de um portfólio de QA usado como referência. A estrutura geral pode lembrar a dele, mas estes elementos estão vetados:
  - terminal verde sobre preto;
  - a fonte Fira Code em tudo;
  - o retrato em ASCII;
  - a lista `[ OK ]`;
  - o "Hello, World!".
- **Número inventado ou inflado.** Toda estimativa é rotulada como estimativa. Número que ainda não foi medido não aparece como medido.
- **Vazamento do empregador ou de clientes:**
  - nenhum nome de empresa empregadora (presente ou passada);
  - nenhum nome de sistema interno (por exemplo, os portais e o SSO do empregador atual);
  - nenhuma tela, URL ou código do trabalho;
  - nenhum dado de cliente da Mater Bakery Box.
  
  A Mater pode ser citada pelo nome: a dona autorizou "sem divulgar dados".
- **Telefone ou endereço pessoal** no site ou no CV público.

## Restrições

- Site estático: HTML, CSS e JavaScript puros, sem build e sem framework. É o mesmo padrão da página de resultados do projeto 1.
- Fontes: Geist (títulos e texto) e Geist Mono (detalhes técnicos, rótulos de etapas e números pequenos), do Google Fonts. Nada de monoespaçada no texto corrido.
- Publicação no GitHub Pages da conta `luizhenrisouto`.
- **Push, criação de repositório e publicação só com o usuário.** Os commits usam a identidade local `Luiz Henri Souto <luizhenrisouto@users.noreply.github.com>`.
- `prefers-reduced-motion`: as animações param e tudo aparece já aceso.

## Identidade visual (decidida nos esboços)

**Paleta "azul elétrico":**

| Uso | Cor |
|---|---|
| Fundo | `#0a0d16`, com brilho radial `#1a2550` no canto superior direito |
| Texto | `#eef1fa` |
| Texto secundário | `#8a93ad` |
| Bordas e linhas | `#262e45` |
| Grade de blueprint | `#1a2033` |
| Acento | `#5b8cff` |
| Sucesso / "no ar" | `#3ddc97` |

**Efeitos que entram:**
- grade de blueprint que some com máscara radial;
- pipeline cujas etapas acendem uma a uma, em sequência, com a linha "correndo" entre elas;
- a etapa final ("impacto") com contorno e brilho no acento;
- ponto verde pulsando no indicador "projetos em produção";
- os cartões de projeto repetem o pipeline em versão menor.

**Esboço de referência:** `.superpowers/brainstorm/5383-1794512910/content/pipeline-dark.html`, opção 1.

## Estrutura da página (ordem aprovada)

**Menu:** marca `luiz.souto` e as âncoras projetos · como testo · trajetória · ferramentas · contato, mais a troca PT/EN.

1. **Topo**
   - Título: "QA que constrói ferramentas com IA. E coloca no ar."
   - Linha de apoio: 15 anos testando software, agora construindo com IA e medindo com uso real.
   - Pipeline animado: ideia → build com IA → testes → deploy → impacto (horas economizadas).
   - Botões "Ver projetos" e "Baixar CV".
   - Três números de prova.
2. **Projetos.** Um cartão por projeto, com mini-pipeline, números do relatório real e dois links: "ver funcionando" e "código".
   - **Triagem de falhas com IA:** n8n com Gemini/Claude classificam falhas de teste, abrem issues e publicam relatório.
     - Página ao vivo: https://luizhenrisouto.github.io/triagem-de-falhas-ia/
     - Repositório: `luizhenrisouto/triagem-de-falhas-ia`
   - **Painel de pedidos · Mater Bakery Box:** pedidos do WhatsApp extraídos por IA, pagamento pelo Mercado Pago com estorno automático, estoque e produção.
     - A demonstração pública virá do repositório genérico em `portfolio/painel-encomendas`, em modo demo e com dados fictícios. **Ainda não existe.**
3. **Como eu testo.** Cada tipo de teste é ligado a uma prova:

   | Tipo de teste | Prova |
   |---|---|
   | Avaliação de IA (evals) | triagem comparada com o gabarito |
   | E2E web | telas do painel |
   | API e contrato | pagamento duplicado vira estorno |
   | Banco de dados | regras de estoque e capacidade |
   | Desempenho, mobile, BDD, Kafka | "experiência profissional", só texto |
   | IA no fluxo de QA | agentes e skills no Claude Code, só texto |

4. **Trajetória.** São 15 anos em linha do tempo **por setor e atuação, sem nomes de empresa**:
   - **Operadora de saúde:** estratégia e automação de portal web com mais de 10 microsserviços.
     - Playwright e TypeScript.
     - Testes de API e contrato.
     - JMeter, Kafka e webhooks.
     - Migração de login para SSO.
     - Evidências para decisões de go/no-go.
     - IA com agentes e skills.
   - **Seguradora:** .NET/C# com SpecFlow.
   - **Grande varejista, centro de excelência:** automação compartilhada entre todos os squads e marcas.
   - **Meios de pagamento:** web, API e mobile, quality gate, ERP e Kafka.
   - **Consultoria:** marketplace de varejo, com Ruby e Java.
   - **Setor de energia:** testes manuais.
   - **Início como desenvolvedor Java.**
5. **Ferramentas.** Dois grupos curtos:
   - **Nos meus projetos (com link):** n8n, Gemini, Claude, Supabase, Playwright, Vitest, GitHub Actions.
   - **No trabalho:** Java/Rest Assured, C#/SpecFlow, Selenium, Cypress, Appium, JMeter, Kafka, Azure DevOps, Jenkins.
6. **Contato.** LinkedIn, GitHub, e-mail (o usuário confirma se entra) e CV para baixar.

## Números: de onde vem cada um

- **Triagem:** lidos **ao vivo** do `dados/indice.json` publicado na página do projeto 1:
  - `totais.horasEconomizadas`;
  - `acertoMedioPct`;
  - `custoTotalUsd`;
  - `falhasTriadas`;
  - `execucoes`.
  
  O GitHub Pages permite essa leitura entre domínios. Se a leitura falhar, o site mostra os últimos valores gravados no próprio site, com a data deles.
- **Mater:**
  - "Antes": estimativa da dona, de cerca de 30 min por pedido, com 8 pedidos por semana. Aparece rotulada como **estimativa da dona**.
  - "Depois": medido em uso real após a instalação (Task 9). **Até existir medição, o cartão mostra "em medição desde <data>" e não exibe economia.**
  - Quantidade de testes: contagem real da suíte do painel no momento da publicação.
- **Impacto no topo (decisão do usuário):** "~4 h/semana" no painel da Mater, sempre com o rótulo visível **"estimativa da dona: ~30 min por pedido × 8 pedidos/semana"**. Quando houver medição real depois da instalação, o número é trocado pelo medido e o rótulo muda para "medido em uso". As horas da triagem aparecem no cartão dela, não no topo.
- **Lançamento (decisão do usuário):** o site vai ao ar **antes** da demo pública da Mater. O cartão do painel mostra "demonstração em breve" no lugar do link "ver funcionando", sem nenhuma captura do painel real. O link do código também só aparece quando o repositório genérico for público.

### Decisões tomadas na revisão (do autor do desenho; o usuário confere)

- **As horas da triagem são estimativa.** Elas saem de 30 min por falha distinta, estimativa do usuário, menos o tempo da automação. Por isso aparecem sempre com o rótulo "estimativa: 30 min por falha", inclusive se forem para o topo.
- **Os dados publicados são reais.** A página ao vivo (verificado em 12/11/2026) tem execuções reais do GitHub Actions, com URL e commit verdadeiros: 6 execuções, 24 falhas triadas, 4 distintas, 100% de acerto e cerca de 1,9 h. Os valores de exemplo (`commit: "abc"`) existem só na cópia local. O site lê a página publicada, nunca a local.
- **A suíte triada é de demonstração**, com falhas plantadas e um gabarito. O cartão diz isso abertamente: "suíte de demonstração com falhas plantadas e gabarito".
- **Unidade do impacto:** total acumulado ("x h economizadas até agora"), nunca uma projeção mensal. O "17 h/mês" dos esboços era só exemplo.
- **Três números de prova no topo:** acerto da IA, falhas triadas e custo total, todos da triagem e ao vivo. Os números da Mater entram quando forem públicos e medidos.
- **Fallback:** um `dados/fallback.json` no próprio site, copiado à mão a cada publicação e exibido com a data. Não há job automático.
- **Endereço:** repositório `luizhenrisouto.github.io`, publicado na raiz `https://luizhenrisouto.github.io/`. A criação e o push são feitos com o usuário.

## CV para as vagas do iFood (decisão do usuário)

Um CV **específico para as vagas de GenAI do iFood**. É o que o usuário vai anexar na inscrição e o que o botão "Baixar CV" entrega. Não substitui o CV normal dele.

- **Conteúdo:** a mesma mensagem do site.
  - Abre com "QA Sênior que constrói ferramentas com IA".
  - Logo depois, uma seção **Projetos com IA**, antes da experiência:
    - a triagem, com link do repositório, link da página ao vivo e números reais com rótulo de estimativa onde couber;
    - o painel da Mater, com o que faz e a estimativa de 4 h/semana rotulada, mais o link do repositório quando for público.
  - Depois, a experiência resumida, dando destaque ao uso de IA no fluxo de QA.
  - Por último, ferramentas, formação e idiomas.
  - Termos da trilha AI Builder onde forem verdadeiros: prompt engineering, automação com n8n, agentes, avaliação de IA (evals), deploy.
- **Formação (decisão do usuário):** o CV inclui a **FIAP, Tecnólogo em Inteligência Artificial**, com o status real no momento de gerar o PDF:
  - "matriculado, início em <mês/ano>" quando houver matrícula;
  - "cursando" depois do início das aulas.
  
  Nunca aparece como cursando antes disso. Os cursos já existentes continuam: técnico em informática (QI) e ADS na Unisinos, trancado. A trajetória do site também ganha a linha da FIAP.
- **Fonte dos fatos:** o CV atual do usuário (`Downloads\cv_luiz_henri.pdf`). Nada é acrescentado que não esteja nele ou nos repositórios.
- **Privacidade:** o arquivo fica público no site, então segue as mesmas regras do site.
  - Sem telefone.
  - Empregadores descritos por setor, sem nomes de empresas e sem nomes de sistemas internos.
  - E-mail só se o usuário confirmar.
  - A instituição de ensino pode aparecer.
- **Formato:** PDF de 1 a 2 páginas, gerado a partir de um HTML no próprio repositório, para dar para regenerar. Visual sóbrio e claro, legível por sistemas de triagem de currículos (texto selecionável, sem colunas complexas), com um toque discreto do azul do site.
- **Idiomas:** PT, com uma versão em EN para o botão do site em inglês.

## O que fica para quem constrói

- Microtextos finais em PT e EN, dentro das regras acima.
- Comportamento responsivo do pipeline no celular: vertical ou com rolagem, à escolha de quem constrói, desde que legível.
- Ícones das ferramentas: texto simples ou ícones SVG próprios, sem logos copiados de outro site.
- Testes: Playwright para a página (carrega, troca de idioma, números aparecem, fallback sem rede, sem rolagem horizontal no celular, nenhum nome vetado no HTML).

## Pendências que dependem de outros trabalhos

- Demo pública do painel da Mater, que depende do repositório genérico.
- Medição real do "depois" da Mater, que depende da instalação (Task 9) e de algumas semanas de uso.

## Mudanças depois da aprovação (pedidas pelo usuário em 12/11/2026)

- **CV fora do site.** O CV vai só anexado na inscrição do iFood. O site não tem botão "Baixar CV", e o CV mora numa pasta privada (`portfolio/cv-ifood`), fora deste repositório público.
- **CV com nomes de empresas.** Como o CV não é público, ele traz os empregadores, os clientes e os sistemas, como no CV original do usuário. O site continua sem esses nomes.
- **Cartão da Mater:** "Site de pedidos e painel", com catálogo, checkout e Mercado Pago. Colar a conversa do WhatsApp aparece só como o caminho para pedidos que chegam por lá.
- **Contato:** LinkedIn, GitHub e e-mail confirmados pelo usuário.
- **FIAP:** matriculado, início em fev/2027, conclusão prevista em dez/2028.
