import { describe, expect, test } from "vitest";
import { ESQUEMA_TRIAGEM, MODELO, CATEGORIAS, montarPedido, lerResposta, chamarGemini } from "../../worker/src/gemini.js";

const TRIAGEM = {
  categoria: "teste_quebrado",
  confianca: 0.8,
  resumo: "Seletor do botão remover não existe",
  passos: ["Abrir o carrinho", "Clicar em remover"],
  esperado: "O carrinho fica vazio",
  obtido: "O teste não encontra o botão",
  causaProvavel: "O seletor mudou",
  sugestaoCorrecao: "Atualizar o seletor",
};
const respostaCom = (texto, extra = {}) => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: texto }] }, ...extra }] });

describe("montarPedido", () => {
  test("usa o prompt da triagem, o esquema e a língua", () => {
    const pt = montarPedido({ erro: "TimeoutError: locator.click", codigo: "await page.click('#x')", lingua: "pt" });
    const en = montarPedido({ erro: "TimeoutError: locator.click", lingua: "en" });
    expect(pt.systemInstruction.parts[0].text).toContain("analista de QA sênior");
    expect(pt.systemInstruction.parts[0].text).toContain("Responda em português do Brasil.");
    expect(en.systemInstruction.parts[0].text).toContain("Answer in English.");
    expect(pt.generationConfig.responseMimeType).toBe("application/json");
    expect(pt.generationConfig.responseJsonSchema).toBe(ESQUEMA_TRIAGEM);
    const textoPt = pt.contents[0].parts[0].text;
    expect(textoPt).toContain("TimeoutError: locator.click");
    expect(textoPt).toContain("Trecho do código do teste:");
    expect(textoPt).toContain("await page.click('#x')");
    expect(en.contents[0].parts[0].text).toContain("(não informado)");
  });

  test("modelo e categorias iguais aos da triagem", () => {
    expect(MODELO).toBe("gemini-3.5-flash-lite");
    expect(CATEGORIAS).toEqual(["bug_produto", "teste_instavel", "teste_quebrado"]);
  });
});

describe("língua da resposta", () => {
  test("a língua também vai na mensagem do usuário, pedindo todos os campos nela", () => {
    const en = montarPedido({ erro: "Error: expected 1 to be 2 em algum teste", lingua: "en" });
    const pt = montarPedido({ erro: "Error: expected 1 to be 2 em algum teste", lingua: "pt" });
    expect(en.systemInstruction.parts[0].text).toContain("Write every field in English, even though the evidence and these instructions are in Portuguese.");
    expect(en.contents[0].parts[0].text.trim().endsWith("Answer language: English. Write every field in English.")).toBe(true);
    expect(pt.contents[0].parts[0].text.trim().endsWith("Língua da resposta: português do Brasil, com acentuação correta.")).toBe(true);
  });
});

describe("lerResposta", () => {
  test("aceita uma triagem válida", () => {
    expect(lerResposta(respostaCom(JSON.stringify(TRIAGEM)))).toEqual({ triagem: TRIAGEM });
  });

  test("recusa JSON inválido, categoria fora da lista, finishReason diferente de STOP e resposta sem candidato", () => {
    const invalida = { erro: "resposta_invalida" };
    expect(lerResposta(respostaCom("{não é json"))).toEqual(invalida);
    expect(lerResposta(respostaCom(JSON.stringify({ ...TRIAGEM, categoria: "outra" })))).toEqual(invalida);
    expect(lerResposta(respostaCom(JSON.stringify(TRIAGEM), { finishReason: "MAX_TOKENS" }))).toEqual(invalida);
    expect(lerResposta({ candidates: [] })).toEqual(invalida);
    expect(lerResposta(null)).toEqual(invalida);
  });

  test("ignora partes de pensamento (thought: true)", () => {
    const r = { candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "pensando..." }, { text: JSON.stringify(TRIAGEM) }] } }] };
    expect(lerResposta(r)).toEqual({ triagem: TRIAGEM });
  });

  test("descarta campos extras e força tipos", () => {
    const sujo = { ...TRIAGEM, confianca: 7, extra: "<script>", passos: ["a", 3] };
    const { triagem } = lerResposta(respostaCom(JSON.stringify(sujo)));
    expect(triagem).not.toHaveProperty("extra");
    expect(triagem.confianca).toBe(1);
    expect(triagem.passos).toEqual(["a", "3"]);
  });
});

describe("chamarGemini", () => {
  const pedido = montarPedido({ erro: "Error: expected 1 to be 2", lingua: "pt" });

  test("devolve ia_indisponivel em erro HTTP, exceção de rede e tempo esgotado", async () => {
    const http503 = async () => new Response("{}", { status: 503 });
    const rede = async () => { throw new Error("rede"); };
    const lento = (_url, { signal }) =>
      new Promise((_, rejeitar) => signal.addEventListener("abort", () => rejeitar(new Error("abortado"))));
    for (const buscar of [http503, rede, lento]) {
      expect(await chamarGemini({ chave: "k", pedido, buscar, limiteMs: 50 })).toEqual({ erro: "ia_indisponivel" });
    }
  });

  test("devolve a triagem quando o Gemini responde certo", async () => {
    const buscar = async () => new Response(JSON.stringify(respostaCom(JSON.stringify(TRIAGEM))), { status: 200 });
    expect(await chamarGemini({ chave: "k", pedido, buscar, limiteMs: 1000 })).toEqual({ triagem: TRIAGEM });
  });

  test("envia a chave no cabeçalho x-goog-api-key e nunca na URL", async () => {
    let url, op;
    const buscar = async (u, o) => { url = u; op = o; return new Response(JSON.stringify(respostaCom(JSON.stringify(TRIAGEM)))); };
    await chamarGemini({ chave: "CHAVE-SECRETA", pedido, buscar, limiteMs: 1000 });
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`);
    expect(url).not.toContain("CHAVE-SECRETA");
    expect(op.headers["x-goog-api-key"]).toBe("CHAVE-SECRETA");
    expect(op.method).toBe("POST");
  });

  test("em erro do Gemini, registra só o código e o status do Google, nunca o pedido", async () => {
    const avisos = [];
    const original = console.warn;
    console.warn = (...a) => avisos.push(a.join(" "));
    try {
      const corpo = { error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } };
      const buscar = async () => new Response(JSON.stringify(corpo), { status: 400 });
      const p = montarPedido({ erro: "TEXTO-DO-VISITANTE-SECRETO com mais de vinte", lingua: "pt" });
      expect(await chamarGemini({ chave: "CHAVE", pedido: p, buscar, limiteMs: 1000 })).toEqual({ erro: "ia_indisponivel" });
    } finally {
      console.warn = original;
    }
    expect(avisos).toEqual(["gemini: HTTP 400 INVALID_ARGUMENT"]);
    expect(avisos.join(" ")).not.toMatch(/TEXTO-DO-VISITANTE|CHAVE|API key/);
  });

  test("Gemini sobrecarregado (503/429/500) é tentado de novo até 2 vezes", async () => {
    const ok = JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(TRIAGEM) }] } }] });
    let n = 0;
    const buscar = async () => (++n < 3 ? new Response('{"error":{"status":"UNAVAILABLE"}}', { status: 503 }) : new Response(ok));
    const p = montarPedido({ erro: "Error: expected 1 to be 2 em algum teste", lingua: "pt" });
    const r = await chamarGemini({ chave: "k", pedido: p, buscar, limiteMs: 5000, esperaMs: 1 });
    expect(r).toEqual({ triagem: TRIAGEM });
    expect(n).toBe(3);
  });

  test("erro que não adianta repetir (400) não é tentado de novo", async () => {
    let n = 0;
    const buscar = async () => { n++; return new Response('{"error":{"status":"INVALID_ARGUMENT"}}', { status: 400 }); };
    const p = montarPedido({ erro: "Error: expected 1 to be 2 em algum teste", lingua: "pt" });
    expect(await chamarGemini({ chave: "k", pedido: p, buscar, limiteMs: 5000, esperaMs: 1 })).toEqual({ erro: "ia_indisponivel" });
    expect(n).toBe(1);
  });

  test("com detalhar = true (só no script local), mostra também a mensagem do Google", async () => {
    const avisos = [];
    const original = console.warn;
    console.warn = (...a) => avisos.push(a.join(" "));
    try {
      const corpo = { error: { status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } };
      const p = montarPedido({ erro: "Error: expected 1 to be 2 em algum teste", lingua: "pt" });
      await chamarGemini({ chave: "k", pedido: p, buscar: async () => new Response(JSON.stringify(corpo), { status: 400 }), limiteMs: 1000, detalhar: true });
    } finally {
      console.warn = original;
    }
    expect(avisos).toEqual(["gemini: HTTP 400 INVALID_ARGUMENT — API key not valid. Please pass a valid API key."]);
  });
});
