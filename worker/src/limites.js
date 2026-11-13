// Limites de uso da triagem ao vivo, contados no Workers KV.
// A pessoa é identificada por um hash de IP + sal + dia: o IP nunca é gravado.
// A contagem do KV é aproximada (consistência eventual); para proteger a cota grátis, isso basta.

export const POR_PESSOA = 5;
export const GERAL = 200;
const EXPIRA_S = 172800;

export function diaSaoPaulo(agora) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

export async function hashPessoa(ip, sal, dia) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${sal}${ip}${dia}`)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Conta um uso se a pessoa e o dia ainda têm saldo. */
export async function registrarUso({ kv, ip, sal, agora }) {
  const dia = diaSaoPaulo(agora);
  const chavePessoa = `p:${await hashPessoa(ip, sal, dia)}:${dia}`;
  const chaveGeral = `g:${dia}`;
  const usados = Number(await kv.get(chavePessoa)) || 0;
  const total = Number(await kv.get(chaveGeral)) || 0;
  if (usados >= POR_PESSOA) return { ok: false, erro: "limite_pessoa", restantes: 0 };
  if (total >= GERAL) return { ok: false, erro: "limite_geral", restantes: 0 };
  await kv.put(chavePessoa, String(usados + 1), { expirationTtl: EXPIRA_S });
  await kv.put(chaveGeral, String(total + 1), { expirationTtl: EXPIRA_S });
  return { ok: true, restantes: POR_PESSOA - usados - 1 };
}
