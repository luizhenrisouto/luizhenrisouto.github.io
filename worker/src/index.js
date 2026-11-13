// Ponto de entrada do Cloudflare Worker da triagem ao vivo.
import { tratar } from "./triagem.js";

export default {
  fetch: (req, env) => tratar(req, env, { buscar: (url, op) => fetch(url, op), agora: () => new Date() }),
};
