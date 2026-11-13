// Rota POST /triagem do Worker: origem, tamanhos, limites e chamada ao Gemini.
// Nada do texto recebido nem da resposta é registrado em log.
import { montarPedido, chamarGemini } from "./gemini.js";
import { registrarUso } from "./limites.js";

const MIN_ERRO = 20;
const MAX_ERRO = 4000;
const MAX_CODIGO = 2000;
const LIMITE_GEMINI_MS = 25000;

const MENSAGENS = {
  pt: {
    origem: "Origem não autorizada.",
    texto_curto: "Cole a mensagem de erro do teste (pelo menos 20 caracteres).",
    texto_longo: "Texto grande demais: até 4.000 caracteres para o erro e 2.000 para o trecho do teste.",
    limite_pessoa: "Você usou as 5 análises de hoje. Os exemplos continuam funcionando.",
    limite_geral: "O limite de análises de hoje foi atingido. Os exemplos continuam funcionando.",
    ia_indisponivel: "A IA não respondeu agora. Tente de novo em instantes ou use os exemplos.",
    resposta_invalida: "A IA devolveu uma resposta fora do formato. Tente de novo ou use os exemplos.",
    indisponivel: "A IA ao vivo não está disponível agora. Os exemplos continuam funcionando.",
  },
  en: {
    origem: "Origin not allowed.",
    texto_curto: "Paste the test's error message (at least 20 characters).",
    texto_longo: "Text too long: up to 4,000 characters for the error and 2,000 for the test snippet.",
    limite_pessoa: "You have used today's 5 analyses. The examples still work.",
    limite_geral: "Today's analysis limit was reached. The examples still work.",
    ia_indisponivel: "The AI did not answer right now. Try again in a moment or use the examples.",
    resposta_invalida: "The AI returned an answer in the wrong format. Try again or use the examples.",
    indisponivel: "The live AI is not available right now. The examples still work.",
  },
};
const STATUS = { origem: 403, texto_curto: 400, texto_longo: 400, limite_pessoa: 429, limite_geral: 429, ia_indisponivel: 502, resposta_invalida: 502, indisponivel: 503 };

function json(corpo, status, origem) {
  const headers = { "content-type": "application/json; charset=utf-8", Vary: "Origin" };
  if (origem) headers["Access-Control-Allow-Origin"] = origem;
  return new Response(JSON.stringify(corpo), { status, headers });
}

function falha(codigo, lingua, origem, extra = {}) {
  return json({ erro: codigo, mensagem: MENSAGENS[lingua][codigo], ...extra }, STATUS[codigo], origem);
}

export async function tratar(req, env, deps) {
  const url = new URL(req.url);
  const origens = String(env.ORIGENS || "").split(",").map((o) => o.trim()).filter(Boolean);
  const origem = req.headers.get("Origin");
  const permitida = origem && origens.includes(origem) ? origem : null;

  if (url.pathname !== "/triagem" || !["POST", "OPTIONS"].includes(req.method)) return new Response("não encontrado", { status: 404 });

  if (req.method === "OPTIONS") {
    if (!permitida) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": permitida,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  let corpo;
  try {
    corpo = await req.json();
  } catch {
    corpo = null;
  }
  const lingua = corpo?.lingua === "en" ? "en" : "pt";
  if (!permitida) return falha("origem", lingua, null);
  if (!corpo || typeof corpo !== "object") return falha("texto_curto", lingua, permitida);

  const erro = typeof corpo.erro === "string" ? corpo.erro.trim() : "";
  const codigo = typeof corpo.codigo === "string" ? corpo.codigo.trim() : "";
  if (erro.length > MAX_ERRO || codigo.length > MAX_CODIGO) return falha("texto_longo", lingua, permitida);
  if (erro.length < MIN_ERRO) return falha("texto_curto", lingua, permitida);

  // Sem os segredos, o Worker não funciona direito (sem sal o hash do IP perde a proteção): para antes de contar uso.
  if (!env.GEMINI_API_KEY || !env.SAL) return falha("indisponivel", lingua, permitida);

  // O KV pode recusar escritas seguidas na mesma chave: na dúvida, não chama a IA (protege a cota).
  let uso;
  try {
    uso = await registrarUso({ kv: env.LIMITES, ip: req.headers.get("CF-Connecting-IP") || "sem-ip", sal: env.SAL, agora: deps.agora() });
  } catch {
    return falha("ia_indisponivel", lingua, permitida);
  }
  if (!uso.ok) return falha(uso.erro, lingua, permitida, { restantes: 0 });

  const resultado = await chamarGemini({
    chave: env.GEMINI_API_KEY,
    pedido: montarPedido({ erro, codigo, lingua }),
    buscar: deps.buscar,
    limiteMs: LIMITE_GEMINI_MS,
  });
  if (resultado.erro) return falha(resultado.erro, lingua, permitida, { restantes: uso.restantes });
  return json({ triagem: resultado.triagem, restantes: uso.restantes }, 200, permitida);
}
