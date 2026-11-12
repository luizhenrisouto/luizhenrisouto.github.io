# luiz.souto — portfólio

Site pessoal de Luiz Henri Souto, QA Sênior que constrói ferramentas com IA. Mostra os projetos rodando, com números de relatórios reais, em português e inglês.

- **Triagem de falhas de teste com IA**: os números (acerto contra o gabarito, falhas triadas, custo, horas) são lidos ao vivo do [relatório publicado](https://luizhenrisouto.github.io/triagem-de-falhas-ia/). Se a leitura falhar, a página usa `dados/reserva.json` e mostra a data dos dados.
- **Site de pedidos e painel · Mater Bakery Box**: os números ficam em `dados/projetos.json`. A economia de ~4 h/semana é uma estimativa da dona (~30 min por pedido × 8 pedidos/semana) e aparece sempre com esse rótulo.

## Como funciona

HTML, CSS e JavaScript puros, sem build. Para publicar, basta servir a pasta como arquivos estáticos (GitHub Pages).

| Arquivo | O que faz |
|---|---|
| `index.html` | a página, já com os números da reserva (funciona sem JS, em PT) |
| `css/estilo.css` | visual e animações do pipeline (param com "reduzir movimento") |
| `js/dados.js` | leitura ao vivo, validação, reserva e formatação de números e datas |
| `js/i18n.js` | textos em PT e EN e escolha do idioma |
| `js/app.js` | liga dados e idioma à página |

## Rodar e testar

```bash
npm install
node scripts/servir.mjs          # http://127.0.0.1:4180/
npm test                         # Vitest: dados e textos
npm run test:e2e                 # Playwright: página, números, idioma, celular, termos proibidos
```

Os testes de termos proibidos leem `testes/vetados.local.json` (`{ "termos": [...] }`). Esse arquivo é **local e fica fora do git** de propósito: a própria lista tem os nomes que não podem aparecer no site. Sem ele, o teste falha.

## Antes de cada publicação

```bash
node scripts/atualizar-reserva.mjs   # copia os números atuais da triagem para dados/reserva.json
```

Atualize também `dados/projetos.json` quando mudar a quantidade de testes do painel ou quando houver economia medida na Mater (trocando o rótulo de estimativa para "medido em uso").
