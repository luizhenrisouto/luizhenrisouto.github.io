// Números da triagem de falhas com IA: lidos ao vivo da página publicada do projeto,
// com uma cópia de reserva (dados/reserva.json) quando a leitura falha ou vem incompleta.

export const URL_TRIAGEM = "https://luizhenrisouto.github.io/triagem-de-falhas-ia/dados/indice.json";

const CAMPOS = ["execucoes", "falhasTriadas", "acertoMedioPct", "custoTotalUsd", "horasEconomizadas"];
const LOCALE = { pt: "pt-BR", en: "en-US" };
const FUSO = "America/Sao_Paulo";

/** Devolve os totais se o índice estiver completo e numérico; senão, null. */
export function extrairTotais(indice) {
  if (!indice || typeof indice.atualizadoEm !== "string" || Number.isNaN(Date.parse(indice.atualizadoEm))) return null;
  if (!indice.totais) return null;
  const totais = {};
  for (const campo of CAMPOS) {
    const valor = indice.totais[campo];
    if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
    totais[campo] = valor;
  }
  return { atualizadoEm: indice.atualizadoEm, ...totais };
}

export async function lerTriagem({ buscar, reserva }) {
  try {
    const resposta = await buscar(URL_TRIAGEM, { cache: "no-store" });
    if (resposta.ok) {
      const totais = extrairTotais(await resposta.json());
      if (totais) return { fonte: "ao-vivo", ...totais };
    }
  } catch {
    // sem rede ou resposta inválida: segue para a reserva
  }
  return { fonte: "reserva", ...extrairTotais(reserva) };
}

// Intl usa espaço não separável; o texto da página usa espaço normal.
const limpar = (texto) => texto.replace(/[  ]/g, " ");

export function formatarNumero(n, lingua, casas = 0) {
  return limpar(
    new Intl.NumberFormat(LOCALE[lingua], { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n),
  );
}

export function formatarUsd(n, lingua) {
  return limpar(new Intl.NumberFormat(LOCALE[lingua], { style: "currency", currency: "USD" }).format(n));
}

export function formatarData(iso, lingua) {
  const data = new Date(iso);
  if (lingua === "en") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: FUSO }).format(data);
  }
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: FUSO }).format(data);
}
