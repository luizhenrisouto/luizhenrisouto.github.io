// Baixa o índice publicado da triagem e grava dados/reserva.json (a cópia usada se a leitura ao vivo falhar).
// Uso: node scripts/atualizar-reserva.mjs   (rodar antes de cada publicação do site)
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { URL_TRIAGEM, extrairTotais } from "../js/dados.js";

const destino = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dados/reserva.json");
const resposta = await fetch(URL_TRIAGEM, { cache: "no-store" });
if (!resposta.ok) throw new Error(`Leitura falhou: HTTP ${resposta.status}`);
const indice = await resposta.json();
const totais = extrairTotais(indice);
if (!totais) throw new Error("Índice incompleto: reserva não atualizada.");

const { atualizadoEm, ...resto } = totais;
await writeFile(destino, JSON.stringify({ atualizadoEm, totais: resto }, null, 2) + "\n");
console.log(`reserva.json atualizado (${atualizadoEm}): ${resto.falhasTriadas} falhas, ${resto.acertoMedioPct}% de acerto.`);
