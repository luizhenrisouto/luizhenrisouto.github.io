import { describe, expect, test } from "vitest";
import { diaSaoPaulo, hashPessoa, registrarUso, POR_PESSOA, GERAL } from "../../worker/src/limites.js";

function kvFalso() {
  const dados = new Map();
  const gravacoes = [];
  return {
    dados,
    gravacoes,
    async get(chave) { return dados.has(chave) ? dados.get(chave) : null; },
    async put(chave, valor, opcoes) { dados.set(chave, valor); gravacoes.push({ chave, valor, opcoes }); },
  };
}
const agora = new Date("2026-11-13T15:00:00Z");
const IP = "203.0.113.9";

describe("limites de uso", () => {
  test("o dia vira à meia-noite de São Paulo", () => {
    expect(diaSaoPaulo(new Date("2026-11-14T02:59:00Z"))).toBe("2026-11-13");
    expect(diaSaoPaulo(new Date("2026-11-14T03:00:00Z"))).toBe("2026-11-14");
  });

  test("valores do desenho", () => {
    expect(POR_PESSOA).toBe(5);
    expect(GERAL).toBe(200);
  });

  test("hash da pessoa é SHA-256 hex e muda com o dia", async () => {
    const a = await hashPessoa(IP, "sal", "2026-11-13");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPessoa(IP, "sal", "2026-11-14")).not.toBe(a);
  });

  test("5 usos passam e o 6º é recusado", async () => {
    const kv = kvFalso();
    const restantes = [];
    for (let i = 0; i < 5; i++) restantes.push((await registrarUso({ kv, ip: IP, sal: "s", agora })).restantes);
    expect(restantes).toEqual([4, 3, 2, 1, 0]);
    expect(await registrarUso({ kv, ip: IP, sal: "s", agora })).toEqual({ ok: false, erro: "limite_pessoa", restantes: 0 });
  });

  test("outra pessoa não é afetada", async () => {
    const kv = kvFalso();
    for (let i = 0; i < 5; i++) await registrarUso({ kv, ip: IP, sal: "s", agora });
    expect(await registrarUso({ kv, ip: "198.51.100.7", sal: "s", agora })).toEqual({ ok: true, restantes: 4 });
  });

  test("limite geral de 200", async () => {
    const kv = kvFalso();
    kv.dados.set("g:2026-11-13", "200");
    expect(await registrarUso({ kv, ip: IP, sal: "s", agora })).toEqual({ ok: false, erro: "limite_geral", restantes: 0 });
  });

  test("no dia seguinte zera", async () => {
    const kv = kvFalso();
    for (let i = 0; i < 5; i++) await registrarUso({ kv, ip: IP, sal: "s", agora });
    const amanha = new Date("2026-11-14T15:00:00Z");
    expect(await registrarUso({ kv, ip: IP, sal: "s", agora: amanha })).toEqual({ ok: true, restantes: 4 });
  });

  test("guarda hash, nunca o IP, com expiração de 172800 s", async () => {
    const kv = kvFalso();
    await registrarUso({ kv, ip: IP, sal: "s", agora });
    expect([...kv.dados.keys()].some((k) => k.includes(IP))).toBe(false);
    expect([...kv.dados.keys()]).toContain("g:2026-11-13");
    expect(kv.gravacoes.every((g) => g.opcoes?.expirationTtl === 172800)).toBe(true);
  });
});
