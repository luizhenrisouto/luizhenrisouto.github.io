// Gera dados/exemplos-triagem.json: as respostas da IA (PT e EN) para as 4 falhas de exemplo.
// Chama o Gemini direto, com o mesmo pedido do Worker, sem passar pelo Worker público (que tem limite de uso).
// Uso (a chave é digitada pelo dono no próprio terminal e não fica salva): ver worker/README.md, passo 8.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODELO, montarPedido, chamarGemini } from "../worker/src/gemini.js";

const LINGUAS = ["pt", "en"];

/** Descreve a chave sem mostrá-la: só o tamanho e se tem o formato das chaves do Google. */
export function descreverChave(chave) {
  return `chave com ${chave.length} caracteres, ${chave.startsWith("AIza") ? "começa como chave do Google (AIza…)" : "formato sem AIza (as chaves mais novas do Google também são assim)"}`;
}

export async function gerarExemplos({ falhas, chave: bruta, buscar, agora }) {
  const chave = (bruta ?? "").trim();
  if (!chave) throw new Error("Falta a variável de ambiente GEMINI_API_KEY.");
  const exemplos = [];
  for (const f of falhas) {
    const respostas = {};
    const acertou = {};
    for (const lingua of LINGUAS) {
      const pedido = montarPedido({ erro: f.erro, codigo: f.codigo, lingua });
      const r = await chamarGemini({ chave, pedido, buscar, limiteMs: 60000, detalhar: true });
      if (r.erro) throw new Error(`Resposta ${r.erro === "ia_indisponivel" ? "indisponível" : "inválida"} para ${f.id} (${lingua}). Nada foi gravado.`);
      respostas[lingua] = r.triagem;
      acertou[lingua] = r.triagem.categoria === f.gabarito;
    }
    exemplos.push({ id: f.id, rotulo: f.rotulo, gabarito: f.gabarito, erro: f.erro, codigo: f.codigo, respostas, acertou });
  }
  return { geradoEm: agora().toISOString(), modelo: MODELO, exemplos };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const falhas = JSON.parse(await readFile(path.join(raiz, "dados/falhas-exemplo.json"), "utf8"));
  const chave = (process.env.GEMINI_API_KEY ?? "").trim();
  if (chave) console.log(`Usando a ${descreverChave(chave)}.`);
  try {
    const resultado = await gerarExemplos({ falhas, chave, buscar: fetch, agora: () => new Date() });
    await writeFile(path.join(raiz, "dados/exemplos-triagem.json"), JSON.stringify(resultado, null, 2) + "\n");
    const acertos = resultado.exemplos.map((e) => `${e.id}: pt ${e.acertou.pt ? "✓" : "✗"} en ${e.acertou.en ? "✓" : "✗"}`);
    console.log(`dados/exemplos-triagem.json gravado.\n${acertos.join("\n")}`);
  } catch (e) {
    console.error(`\n${e.message}`);
    process.exitCode = 1;
  }
}
