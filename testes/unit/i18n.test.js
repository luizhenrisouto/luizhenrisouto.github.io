import { describe, expect, test } from "vitest";
import { TEXTOS, escolherLingua } from "../../js/i18n.js";

describe("textos", () => {
  test("pt e en têm as mesmas chaves", () => {
    expect(Object.keys(TEXTOS.en).sort()).toEqual(Object.keys(TEXTOS.pt).sort());
  });

  test("nenhum texto vazio", () => {
    for (const lingua of ["pt", "en"]) {
      for (const [chave, texto] of Object.entries(TEXTOS[lingua])) expect(texto.trim(), `${lingua}.${chave}`).not.toBe("");
    }
  });
});

test("escolherLingua", () => {
  expect(escolherLingua(null, "pt-BR")).toBe("pt");
  expect(escolherLingua(null, "en-US")).toBe("en");
  expect(escolherLingua("pt", "en-US")).toBe("pt");
  expect(escolherLingua("xx", "en-US")).toBe("en");
  expect(escolherLingua(null, undefined)).toBe("pt");
});
