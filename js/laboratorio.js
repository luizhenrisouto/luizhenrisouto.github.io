// Laboratório: o visitante testa a triagem de falhas com IA.
// Exemplos: respostas pré-calculadas (dados/exemplos-triagem.json), sem rede.
// Todo texto vindo da IA entra no DOM por textContent, nunca por innerHTML.

const CATEGORIA = {
  pt: { bug_produto: "bug do produto", teste_instavel: "teste instável", teste_quebrado: "teste quebrado" },
  en: { bug_produto: "product bug", teste_instavel: "flaky test", teste_quebrado: "broken test" },
};
const ROTULOS = {
  pt: { confianca: "confiança", causa: "Causa provável", passos: "Passos para reproduzir", esperado: "Esperado", obtido: "Obtido", sugestao: "Sugestão de correção", gabarito: "gabarito", gerado: { pt: "gerado em português", en: "gerado em inglês" } },
  en: { confianca: "confidence", causa: "Likely cause", passos: "Steps to reproduce", esperado: "Expected", obtido: "Actual", sugestao: "Suggested fix", gabarito: "answer key", gerado: { pt: "generated in Portuguese", en: "generated in English" } },
};

const estado = { exemplos: [], lingua: "pt", atual: null };

function el(doc, tag, classe, texto) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

/** Desenha o cartão do resultado. */
export function mostrarResultado(doc, { triagem, gabarito, acertou, linguaGerada }) {
  const lingua = estado.lingua;
  const r = ROTULOS[lingua];
  const cartao = doc.getElementById("lab-resultado");
  cartao.replaceChildren();
  cartao.classList.add("lab-resultado--cheio");

  const cabeca = el(doc, "header", "lab-cabeca");
  cabeca.append(el(doc, "span", `lab-categoria lab-categoria--${triagem.categoria}`, CATEGORIA[lingua][triagem.categoria]));
  const pct = Math.round(triagem.confianca * 100);
  const conf = el(doc, "div", "lab-confianca");
  const barra = el(doc, "span", "lab-confianca__barra");
  const preenchido = el(doc, "span", "lab-confianca__valor");
  preenchido.style.width = `${pct}%`;
  barra.append(preenchido);
  conf.append(barra, el(doc, "span", "lab-confianca__texto mono", `${r.confianca} ${pct}%`));
  cabeca.append(conf);
  cartao.append(cabeca, el(doc, "h3", "lab-resumo", triagem.resumo));

  const lista = el(doc, "dl", "lab-detalhes");
  const item = (titulo, conteudo) => {
    lista.append(el(doc, "dt", null, titulo));
    const dd = el(doc, "dd");
    if (Array.isArray(conteudo)) {
      const ol = el(doc, "ol");
      for (const p of conteudo) ol.append(el(doc, "li", null, p));
      dd.append(ol);
    } else dd.textContent = conteudo;
    lista.append(dd);
  };
  item(r.causa, triagem.causaProvavel);
  item(r.passos, triagem.passos);
  item(r.esperado, triagem.esperado);
  item(r.obtido, triagem.obtido);
  item(r.sugestao, triagem.sugestaoCorrecao);
  cartao.append(lista);

  if (gabarito) {
    cartao.append(el(doc, "p", `lab-gabarito ${acertou ? "lab-gabarito--ok" : "lab-gabarito--erro"}`, `${r.gabarito}: ${CATEGORIA[lingua][gabarito]} ${acertou ? "✓" : "✗"}`));
  }
  if (linguaGerada && linguaGerada !== lingua) cartao.append(el(doc, "p", "lab-nota", r.gerado[linguaGerada]));
}

function desenharExemplos(doc) {
  const caixa = doc.getElementById("lab-exemplos");
  caixa.replaceChildren();
  caixa.closest(".lab-exemplos-bloco").hidden = estado.exemplos.length === 0;
  for (const ex of estado.exemplos) {
    const botao = el(doc, "button", "lab-exemplo", ex.rotulo[estado.lingua]);
    botao.type = "button";
    botao.setAttribute("aria-pressed", String(estado.atual?.tipo === "exemplo" && estado.atual.id === ex.id));
    botao.addEventListener("click", () => abrirExemplo(doc, ex.id));
    caixa.append(botao);
  }
}

function abrirExemplo(doc, id) {
  const ex = estado.exemplos.find((e) => e.id === id);
  if (!ex) return;
  estado.atual = { tipo: "exemplo", id };
  doc.getElementById("lab-erro").value = ex.erro;
  doc.getElementById("lab-codigo").value = ex.codigo || "";
  doc.getElementById("lab-erro").dispatchEvent(new Event("input"));
  mostrarResultado(doc, { triagem: ex.respostas[estado.lingua], gabarito: ex.gabarito, acertou: ex.acertou[estado.lingua] });
  desenharExemplos(doc);
}

/** Redesenha botões e resultado na nova língua. Resultado ao vivo mantém a língua em que foi gerado. */
export function trocarLinguaLaboratorio(doc, lingua) {
  estado.lingua = lingua;
  desenharExemplos(doc);
  if (estado.atual?.tipo === "exemplo") abrirExemplo(doc, estado.atual.id);
  else if (estado.atual?.tipo === "vivo") mostrarResultado(doc, { triagem: estado.atual.triagem, linguaGerada: estado.atual.linguaGerada });
}

export function iniciarLaboratorio(doc, { exemplos, lingua }) {
  estado.exemplos = Array.isArray(exemplos) ? exemplos : [];
  estado.lingua = lingua;
  const campo = doc.getElementById("lab-erro");
  if (!campo.dataset.ligado) {
    campo.dataset.ligado = "1";
    const contador = doc.getElementById("lab-contador");
    campo.addEventListener("input", () => { contador.textContent = String(campo.value.trim().length); });
  }
  desenharExemplos(doc);
}

export const _estado = estado; // usado pela análise ao vivo
