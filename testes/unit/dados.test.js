import { describe, expect, test } from "vitest";
import { lerTriagem, formatarNumero, formatarUsd, formatarData } from "../../js/dados.js";

const RESERVA = {
  atualizadoEm: "2026-11-10T10:00:00Z",
  totais: { execucoes: 5, falhasTriadas: 20, acertoMedioPct: 95, custoTotalUsd: 0.01, horasEconomizadas: 1.5 },
};

const AO_VIVO = {
  atualizadoEm: "2026-11-12T18:47:33Z",
  totais: { execucoes: 6, falhasTriadas: 24, acertoMedioPct: 100, custoTotalUsd: 0, horasEconomizadas: 1.9485 },
};

const responde = (corpo, ok = true) => async () => ({ ok, json: async () => corpo });

describe("lerTriagem", () => {
  test("usa os totais ao vivo quando a leitura funciona", async () => {
    const r = await lerTriagem({ buscar: responde(AO_VIVO), reserva: RESERVA });
    expect(r.fonte).toBe("ao-vivo");
    expect(r.falhasTriadas).toBe(24);
    expect(r.atualizadoEm).toBe("2026-11-12T18:47:33Z");
  });

  test("cai na reserva quando a rede falha", async () => {
    const r = await lerTriagem({ buscar: async () => { throw new Error("rede"); }, reserva: RESERVA });
    expect(r.fonte).toBe("reserva");
    expect(r.falhasTriadas).toBe(20);
    expect(r.atualizadoEm).toBe("2026-11-10T10:00:00Z");
  });

  test("cai na reserva quando a resposta não é ok", async () => {
    const r = await lerTriagem({ buscar: responde(AO_VIVO, false), reserva: RESERVA });
    expect(r.fonte).toBe("reserva");
  });

  test("cai na reserva quando falta campo ou não é número", async () => {
    const texto = { ...AO_VIVO, totais: { ...AO_VIVO.totais, acertoMedioPct: "100" } };
    const semHoras = { ...AO_VIVO, totais: { ...AO_VIVO.totais, horasEconomizadas: undefined } };
    expect((await lerTriagem({ buscar: responde(texto), reserva: RESERVA })).fonte).toBe("reserva");
    expect((await lerTriagem({ buscar: responde(semHoras), reserva: RESERVA })).fonte).toBe("reserva");
    expect((await lerTriagem({ buscar: responde({ totais: {} }), reserva: RESERVA })).fonte).toBe("reserva");
  });

  test("cai na reserva quando a data não é válida", async () => {
    const r = await lerTriagem({ buscar: responde({ ...AO_VIVO, atualizadoEm: "lixo" }), reserva: RESERVA });
    expect(r.fonte).toBe("reserva");
    expect(r.atualizadoEm).toBe("2026-11-10T10:00:00Z");
  });
});

describe("formatação", () => {
  test("formata horas no idioma", () => {
    expect(formatarNumero(1.9485, "pt", 1)).toBe("1,9");
    expect(formatarNumero(1.9485, "en", 1)).toBe("1.9");
  });

  test("formata data no idioma", () => {
    expect(formatarData("2026-11-12T18:47:33Z", "pt")).toBe("12/11/2026");
    expect(formatarData("2026-11-12T18:47:33Z", "en")).toBe("Nov 12, 2026");
  });

  test("formata dólar no idioma", () => {
    expect(formatarUsd(0.258, "pt")).toBe("US$ 0,26");
    expect(formatarUsd(0.258, "en")).toBe("$0.26");
  });
});
