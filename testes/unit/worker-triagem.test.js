import { afterEach, describe, expect, test, vi } from "vitest";
import { tratar } from "../../worker/src/triagem.js";

const ORIGEM = "https://luizhenrisouto.github.io";
const TRIAGEM = {
  categoria: "bug_produto", confianca: 0.9, resumo: "Sobrenome não aceita texto", passos: ["Abrir o checkout"],
  esperado: "Aceita o sobrenome", obtido: "Campo fica vazio", causaProvavel: "Bug no campo", sugestaoCorrecao: "Verificar o campo",
};
const ERRO = "Error: expect(locator).toHaveValue(expected) failed — Expected: \"Silva\" Received: \"\"";

function kvFalso() {
  const dados = new Map();
  return { dados, async get(k) { return dados.get(k) ?? null; }, async put(k, v) { dados.set(k, v); } };
}
function ambiente() {
  return { GEMINI_API_KEY: "chave", SAL: "sal", ORIGENS: `${ORIGEM},http://127.0.0.1:4180`, LIMITES: kvFalso() };
}
const geminiOk = vi.fn(async () =>
  new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(TRIAGEM) }] } }] })),
);
const deps = (buscar = geminiOk) => ({ buscar, agora: () => new Date("2026-11-13T15:00:00Z") });
function pedido(corpo, { origem = ORIGEM, metodo = "POST", caminho = "/triagem", ip = "203.0.113.9" } = {}) {
  const headers = { "content-type": "application/json", "CF-Connecting-IP": ip };
  if (origem) headers.Origin = origem;
  return new Request(`https://triagem-ao-vivo.exemplo.workers.dev${caminho}`, {
    method: metodo, headers, body: metodo === "POST" ? (typeof corpo === "string" ? corpo : JSON.stringify(corpo)) : undefined,
  });
}

afterEach(() => { vi.restoreAllMocks(); geminiOk.mockClear(); });

describe("rota POST /triagem", () => {
  test("OPTIONS de origem aceita responde 204 com CORS e Vary: Origin", async () => {
    const r = await tratar(pedido(null, { metodo: "OPTIONS" }), ambiente(), deps());
    expect(r.status).toBe(204);
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEM);
    expect(r.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(r.headers.get("Vary")).toBe("Origin");
  });

  test("origem fora da lista ou sem Origin responde 403 origem", async () => {
    for (const origem of ["https://outro.site", null]) {
      const r = await tratar(pedido({ erro: ERRO, lingua: "pt" }, { origem }), ambiente(), deps());
      expect(r.status).toBe(403);
      expect((await r.json()).erro).toBe("origem");
    }
    expect(geminiOk).not.toHaveBeenCalled();
  });

  test("rota ou método diferente responde 404", async () => {
    expect((await tratar(pedido({}, { caminho: "/outra" }), ambiente(), deps())).status).toBe(404);
    expect((await tratar(pedido(null, { metodo: "GET" }), ambiente(), deps())).status).toBe(404);
  });

  test("tamanhos: curto, longo e código longo dão 400 sem chamar a IA nem contar uso", async () => {
    const env = ambiente();
    const casos = [
      [{ erro: "curto", lingua: "pt" }, "texto_curto"],
      [{ erro: "x".repeat(4001), lingua: "pt" }, "texto_longo"],
      [{ erro: ERRO, codigo: "y".repeat(2001), lingua: "pt" }, "texto_longo"],
      [{ erro: "   " + "a".repeat(10) + "        ", lingua: "pt" }, "texto_curto"],
    ];
    for (const [corpo, codigo] of casos) {
      const r = await tratar(pedido(corpo), env, deps());
      expect(r.status).toBe(400);
      expect((await r.json()).erro).toBe(codigo);
    }
    expect(geminiOk).not.toHaveBeenCalled();
    expect(env.LIMITES.dados.size).toBe(0);
  });

  test("JSON inválido no corpo → 400 texto_curto", async () => {
    const r = await tratar(pedido("{não é json"), ambiente(), deps());
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe("texto_curto");
  });

  test("sucesso → 200 { triagem, restantes: 4 } com CORS", async () => {
    const r = await tratar(pedido({ erro: ERRO, lingua: "pt" }), ambiente(), deps());
    expect(r.status).toBe(200);
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEM);
    expect(await r.json()).toEqual({ triagem: TRIAGEM, restantes: 4 });
  });

  test("6º uso → 429 limite_pessoa com restantes 0, sem chamar o Gemini", async () => {
    const env = ambiente();
    for (let i = 0; i < 5; i++) await tratar(pedido({ erro: ERRO, lingua: "pt" }), env, deps());
    geminiOk.mockClear();
    const r = await tratar(pedido({ erro: ERRO, lingua: "pt" }), env, deps());
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ erro: "limite_pessoa", restantes: 0 });
    expect(geminiOk).not.toHaveBeenCalled();
  });

  test("Gemini fora → 502 ia_indisponivel com restantes, e o uso conta", async () => {
    const env = ambiente();
    const r = await tratar(pedido({ erro: ERRO, lingua: "pt" }), env, deps(async () => new Response("{}", { status: 503 })));
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ erro: "ia_indisponivel", restantes: 4 });
  });

  test("mensagens de erro em inglês quando lingua = en", async () => {
    const pt = await (await tratar(pedido({ erro: "curto", lingua: "pt" }), ambiente(), deps())).json();
    const en = await (await tratar(pedido({ erro: "curto", lingua: "en" }), ambiente(), deps())).json();
    expect(pt.mensagem).not.toBe(en.mensagem);
    expect(en.mensagem).toMatch(/[a-z]/i);
    expect(en.mensagem).not.toMatch(/[ãçõé]/);
  });

  test("nada do texto enviado aparece no console", async () => {
    const espioes = ["log", "error", "warn", "info"].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await tratar(pedido({ erro: ERRO, codigo: "CODIGO-SECRETO-DO-TESTE", lingua: "pt" }), ambiente(), deps());
    await tratar(pedido({ erro: ERRO, lingua: "pt" }), ambiente(), deps(async () => { throw new Error("rede"); }));
    const tudo = espioes.flatMap((e) => e.mock.calls.flat().map(String)).join(" ");
    expect(tudo).not.toContain("Silva");
    expect(tudo).not.toContain("CODIGO-SECRETO-DO-TESTE");
  });
});
