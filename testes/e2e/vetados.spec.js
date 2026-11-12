import { test, expect } from "@playwright/test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "../..");
const LISTA = path.join(RAIZ, "testes/vetados.local.json");
export const TELEFONE = /(?<![\d.])\(?\d{2}\)?[\s-]?9\d{4}-?\d{4}(?!\d)/;

function htmls(dir) {
  return readdirSync(dir).flatMap((nome) => {
    if (["node_modules", ".git", ".superpowers", "test-results", "docs"].includes(nome)) return [];
    const p = path.join(dir, nome);
    if (statSync(p).isDirectory()) return htmls(p);
    return /.(html|js|json)$/.test(nome) && !p.includes(`${path.sep}testes${path.sep}`) && nome !== "package-lock.json" ? [p] : [];
  });
}

test("nenhum termo vetado nem telefone", () => {
  if (!existsSync(LISTA)) throw new Error("crie testes/vetados.local.json (lista local de termos proibidos)");
  const { termos } = JSON.parse(readFileSync(LISTA, "utf8"));
  const arquivos = htmls(RAIZ);
  expect(arquivos.length).toBeGreaterThan(0);
  for (const arquivo of arquivos) {
    const texto = readFileSync(arquivo, "utf8").toLowerCase();
    for (const termo of termos) expect(texto, `${path.relative(RAIZ, arquivo)} contém "${termo}"`).not.toContain(termo);
    expect(texto, `${path.relative(RAIZ, arquivo)} tem telefone`).not.toMatch(TELEFONE);
  }
});
