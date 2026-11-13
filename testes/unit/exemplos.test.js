import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { gerarExemplos } from "../../scripts/gerar-exemplos-triagem.mjs";

const FALHAS = JSON.parse(readFileSync(new URL("../../dados/falhas-exemplo.json", import.meta.url), "utf8"));

function geminiFalso(categoriaPorChamada) {
  let n = 0;
  const chamadas = [];
  const buscar = async (url, op) => {
    chamadas.push(JSON.parse(op.body));
    const categoria = categoriaPorChamada(n++);
    const triagem = { categoria, confianca: 0.7, resumo: "r", passos: ["p"], esperado: "e", obtido: "o", causaProvavel: "c", sugestaoCorrecao: "s" };
    return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(triagem) }] } }] }));
  };
  return { buscar, chamadas };
}

describe("exemplos da triagem ao vivo", () => {
  test("falhas-exemplo tem 4 itens, cobre as 3 categorias e nenhum caminho absoluto", () => {
    expect(FALHAS).toHaveLength(4);
    expect(new Set(FALHAS.map((f) => f.gabarito))).toEqual(new Set(["bug_produto", "teste_instavel", "teste_quebrado"]));
    for (const f of FALHAS) {
      expect(f.rotulo.pt && f.rotulo.en).toBeTruthy();
      expect(f.erro.length).toBeGreaterThanOrEqual(20);
      expect(f.erro.length).toBeLessThanOrEqual(4000);
      expect(f.codigo.length).toBeLessThanOrEqual(2000);
      expect(`${f.erro}\n${f.codigo}`).not.toMatch(/[A-Za-z]:\|\/Users\/|\/home\//);
    }
  });

  test("gerarExemplos chama o Gemini 8 vezes e calcula acertou comparando com o gabarito", async () => {
    const { buscar, chamadas } = geminiFalso(() => "bug_produto");
    const r = await gerarExemplos({ falhas: FALHAS, chave: "k", buscar, agora: () => new Date("2026-11-13T12:00:00Z") });
    expect(chamadas).toHaveLength(8);
    expect(r.geradoEm).toBe("2026-11-13T12:00:00.000Z");
    expect(r.modelo).toBe("gemini-3.5-flash-lite");
    expect(r.exemplos).toHaveLength(4);
    for (const e of r.exemplos) {
      expect(e.respostas.pt.categoria).toBe("bug_produto");
      expect(e.respostas.en.categoria).toBe("bug_produto");
      expect(e.acertou.pt).toBe(e.gabarito === "bug_produto");
      expect(e.acertou.en).toBe(e.gabarito === "bug_produto");
      expect(e.erro).toBe(FALHAS.find((f) => f.id === e.id).erro);
    }
  });

  test("gerarExemplos falha alto se faltar a chave", async () => {
    await expect(gerarExemplos({ falhas: FALHAS, chave: "", buscar: async () => {}, agora: () => new Date() })).rejects.toThrow(/GEMINI_API_KEY/);
  });

  test("gerarExemplos falha alto se alguma resposta vier inválida", async () => {
    let n = 0;
    const { buscar } = geminiFalso(() => (n++ === 5 ? "categoria_inventada" : "bug_produto"));
    await expect(gerarExemplos({ falhas: FALHAS, chave: "k", buscar, agora: () => new Date() })).rejects.toThrow(/inválida|indisponível/);
  });
});
