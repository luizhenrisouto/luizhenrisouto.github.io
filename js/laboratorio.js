// Laboratório: o visitante testa a triagem de falhas com IA.
// Exemplos: respostas pré-calculadas (dados/exemplos-triagem.json), sem rede.
// Análise ao vivo: o texto colado vai ao Worker (worker/), que chama o Gemini com limite de uso.
// Todo texto vindo da IA entra no DOM por textContent, nunca por innerHTML.
import { formatarNumero } from "./dados.js";

// Preenchida no deploy do Worker (worker/README.md).
export const URL_TRIAGEM_VIVO = "https://triagem-ao-vivo.PREENCHER.workers.dev/triagem";
const MIN_ERRO = 20;
const MAX_ERRO = 4000;
const MAX_CODIGO = 2000;
const LIMITE_MS = 30000;

const MENSAGENS = {
  pt: {
    texto_curto: "Cole a mensagem de erro do teste (pelo menos 20 caracteres).",
    texto_longo: "Texto grande demais: até 4.000 caracteres para o erro e 2.000 para o trecho do teste.",
    limite_pessoa: "Você usou as 5 análises de hoje. Os exemplos continuam funcionando.",
    limite_geral: "O limite de análises de hoje foi atingido. Os exemplos continuam funcionando.",
    ia_indisponivel: "A IA não respondeu agora. Tente de novo em instantes ou use os exemplos.",
    resposta_invalida: "A IA devolveu uma resposta fora do formato. Tente de novo ou use os exemplos.",
    origem: "A IA ao vivo não está disponível agora. Os exemplos continuam funcionando.",
    rede: "A IA ao vivo não está disponível agora. Os exemplos continuam funcionando.",
    analisando: "Analisando…",
    restam: (n) => `restam ${n} hoje`,
    acerto: (pct, falhas) => `Acerto da mesma IA na triagem do CI, que também recebe o print da tela: ${pct}% em ${falhas} falhas · suíte de demonstração com gabarito`,
  },
  en: {
    texto_curto: "Paste the test's error message (at least 20 characters).",
    texto_longo: "Text too long: up to 4,000 characters for the error and 2,000 for the test snippet.",
    limite_pessoa: "You have used today's 5 analyses. The examples still work.",
    limite_geral: "Today's analysis limit was reached. The examples still work.",
    ia_indisponivel: "The AI did not answer right now. Try again in a moment or use the examples.",
    resposta_invalida: "The AI returned an answer in the wrong format. Try again or use the examples.",
    origem: "The live AI is not available right now. The examples still work.",
    rede: "The live AI is not available right now. The examples still work.",
    analisando: "Analyzing…",
    restam: (n) => `${n} left today`,
    acerto: (pct, falhas) => `Accuracy of the same AI in the CI triage, which also gets the screenshot: ${pct}% over ${falhas} failures · demo suite with answer key`,
  },
};

const CATEGORIA = {
  pt: { bug_produto: "bug do produto", teste_instavel: "teste instável", teste_quebrado: "teste quebrado" },
  en: { bug_produto: "product bug", teste_instavel: "flaky test", teste_quebrado: "broken test" },
};
const ROTULOS = {
  pt: { confianca: "confiança", causa: "Causa provável", passos: "Passos para reproduzir", esperado: "Esperado", obtido: "Obtido", sugestao: "Sugestão de correção", gabarito: "gabarito", gerado: { pt: "gerado em português", en: "gerado em inglês" } },
  en: { confianca: "confidence", causa: "Likely cause", passos: "Steps to reproduce", esperado: "Expected", obtido: "Actual", sugestao: "Suggested fix", gabarito: "answer key", gerado: { pt: "generated in Portuguese", en: "generated in English" } },
};

const estado = { exemplos: [], lingua: "pt", atual: null, restantes: null, ocupado: false, triagemCi: null };

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

function mostrarRestantes(doc) {
  if (estado.restantes !== null) doc.getElementById("lab-restantes").textContent = MENSAGENS[estado.lingua].restam(estado.restantes);
}

/** Rótulo do acerto medido no CI (indice.json publicado). */
export function mostrarAcerto(doc, triagem, lingua) {
  if (triagem) estado.triagemCi = triagem;
  const t = estado.triagemCi;
  if (!t || !Number.isFinite(t.acertoMedioPct)) return;
  doc.getElementById("lab-acerto").textContent = MENSAGENS[lingua ?? estado.lingua].acerto(
    formatarNumero(t.acertoMedioPct, lingua ?? estado.lingua),
    formatarNumero(t.falhasTriadas, lingua ?? estado.lingua),
  );
}

function avisar(doc, codigo) {
  doc.getElementById("lab-mensagem").textContent = codigo ? MENSAGENS[estado.lingua][codigo] ?? MENSAGENS[estado.lingua].rede : "";
}

/** Manda o texto colado ao Worker e mostra o resultado. Uma análise por vez. */
export async function analisarAoVivo(doc, { buscar }) {
  if (estado.ocupado) return;
  const erro = doc.getElementById("lab-erro").value.trim();
  const codigo = doc.getElementById("lab-codigo").value.trim();
  if (erro.length > MAX_ERRO || codigo.length > MAX_CODIGO) return avisar(doc, "texto_longo");
  if (erro.length < MIN_ERRO) return avisar(doc, "texto_curto");

  const lingua = estado.lingua;
  const botao = doc.getElementById("lab-analisar");
  estado.ocupado = true;
  botao.disabled = true;
  doc.getElementById("lab-mensagem").textContent = MENSAGENS[lingua].analisando;
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), globalThis.__labLimiteMs ?? LIMITE_MS);
  try {
    const resposta = await buscar(URL_TRIAGEM_VIVO, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ erro, codigo, lingua }),
      signal: controle.signal,
    });
    const corpo = await resposta.json().catch(() => null);
    if (corpo && Number.isInteger(corpo.restantes)) {
      estado.restantes = corpo.restantes;
      mostrarRestantes(doc);
    }
    if (resposta.ok && corpo?.triagem) {
      estado.atual = { tipo: "vivo", triagem: corpo.triagem, linguaGerada: lingua };
      avisar(doc, null);
      mostrarResultado(doc, { triagem: corpo.triagem, linguaGerada: lingua });
      desenharExemplos(doc);
    } else {
      avisar(doc, corpo?.erro ?? "rede");
    }
  } catch {
    avisar(doc, "rede");
  } finally {
    clearTimeout(relogio);
    estado.ocupado = false;
    botao.disabled = false;
  }
}

/** Redesenha botões e resultado na nova língua. Resultado ao vivo mantém a língua em que foi gerado. */
export function trocarLinguaLaboratorio(doc, lingua) {
  estado.lingua = lingua;
  mostrarRestantes(doc);
  mostrarAcerto(doc, null, lingua);
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
    doc.getElementById("lab-analisar").addEventListener("click", () => analisarAoVivo(doc, { buscar: (u, o) => fetch(u, o) }));
  }
  desenharExemplos(doc);
}
