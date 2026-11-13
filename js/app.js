// Liga os dados da triagem (ao vivo ou reserva) e os números dos projetos à página.
import { lerTriagem, formatarNumero, formatarUsd, formatarData } from "./dados.js";
import { TEXTOS, aplicarTextos, escolherLingua } from "./i18n.js";
import { iniciarLaboratorio, trocarLinguaLaboratorio, mostrarAcerto } from "./laboratorio.js";

/** Escreve os números em todos os [data-num] da página, no formato do idioma. */
export function pintarNumeros(doc, triagem, projetos, lingua) {
  const valores = {};
  if (triagem && Number.isFinite(triagem.falhasTriadas)) {
    valores.acerto = `${formatarNumero(triagem.acertoMedioPct, lingua)}%`;
    valores.falhas = formatarNumero(triagem.falhasTriadas, lingua);
    valores.execucoes = formatarNumero(triagem.execucoes, lingua);
    valores.custo = formatarUsd(triagem.custoTotalUsd, lingua);
    valores.horasTriagem = formatarNumero(triagem.horasEconomizadas, lingua, 1);
    valores.atualizado = formatarData(triagem.atualizadoEm, lingua);
  }
  if (projetos) {
    valores.horasMater = formatarNumero(projetos.mater.horasSemana, lingua);
    valores.testesPainel = formatarNumero(projetos.painel.testes, lingua);
  }
  for (const el of doc.querySelectorAll("[data-num]")) {
    const valor = valores[el.dataset.num];
    if (valor !== undefined) el.textContent = valor;
  }
}

const estado = { triagem: null, projetos: null, lingua: "pt" };
window.__portfolio = estado;

async function lerJson(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(caminho);
  return resposta.json();
}

// localStorage pode lançar erro (aba anônima, cookies bloqueados): a escolha só não fica salva.
const CHAVE = "portfolio.lingua";
function lerSalva() {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}
function salvar(lingua) {
  try { localStorage.setItem(CHAVE, lingua); } catch { /* sem salvar */ }
}

function mudarLingua(lingua) {
  estado.lingua = lingua;
  aplicarTextos(document, lingua);
  pintarNumeros(document, estado.triagem, estado.projetos, lingua);
  trocarLinguaLaboratorio(document, lingua);
}

async function iniciar() {
  for (const botao of document.querySelectorAll("button[data-lingua]")) {
    botao.addEventListener("click", () => {
      salvar(botao.dataset.lingua);
      mudarLingua(botao.dataset.lingua);
    });
  }
  const inicial = escolherLingua(lerSalva(), navigator.language);
  if (inicial !== "pt") mudarLingua(inicial);
  iniciarLaboratorio(document, { exemplos: [], lingua: estado.lingua });
  lerJson("dados/exemplos-triagem.json")
    .then((dados) => iniciarLaboratorio(document, { exemplos: dados.exemplos, lingua: estado.lingua }))
    .catch(() => {}); // sem o arquivo, o bloco de exemplos fica escondido
  try {
    const [reserva, projetos] = await Promise.all([lerJson("dados/reserva.json"), lerJson("dados/projetos.json")]);
    estado.projetos = projetos;
    estado.triagem = await lerTriagem({ buscar: (url, op) => fetch(url, op), reserva });
    document.documentElement.dataset.dados = estado.triagem.fonte;
    const fonte = document.querySelector(".atualizado [data-i18n]");
    if (fonte) {
      fonte.dataset.i18n = estado.triagem.fonte === "ao-vivo" ? "prova.fonteVivo" : "prova.fonteReserva";
      fonte.textContent = TEXTOS[estado.lingua][fonte.dataset.i18n];
    }
    pintarNumeros(document, estado.triagem, estado.projetos, estado.lingua);
    mostrarAcerto(document, estado.triagem, estado.lingua);
  } catch {
    // sem os arquivos locais, os valores escritos no HTML continuam valendo
  }
}

// Brilho que segue o mouse dentro dos cartões. Em telas de toque não há mouse, então nada muda.
const CARTOES = ".projeto, .caso, .testes li, .lab-painel, .lab-resultado";
const PEQUENOS = ".botao, .chips li";
export function ativarBrilho(doc) {
  doc.querySelectorAll(CARTOES).forEach((el) => el.classList.add("brilho"));
  doc.querySelectorAll(PEQUENOS).forEach((el) => el.classList.add("brilho", "brilho--pequeno"));
  doc.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      const el = e.target instanceof Element ? e.target.closest(".brilho") : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${Math.round(e.clientX - r.left)}px`);
      el.style.setProperty("--my", `${Math.round(e.clientY - r.top)}px`);
    },
    { passive: true },
  );
}

ativarBrilho(document);
iniciar();
