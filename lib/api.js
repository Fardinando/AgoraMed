/* ============================================================
   AGORAMED — utilitários compartilhados das funções serverless
   As chaves vivem SÓ nas env vars do Vercel; nada aqui é
   exposto ao navegador.
   ============================================================ */
'use strict';

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '');

/* ------------------------------------------------ respostas */
function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function envFaltando() {
  return ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET']
    .filter((k) => !process.env[k]);
}

/* ------------------------------------------- GoTrue (Auth) */
async function gotrue(caminho, { metodo = 'POST', corpo, token, servico = false } = {}) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1${caminho}`, {
    method: metodo,
    headers: {
      apikey: servico ? SERVICE_KEY : ANON_KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, dados };
}

/* ---------------------------------------------- PostgREST */
async function postgrest(caminho, { metodo = 'GET', corpo, token, servico = false } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${caminho}`, {
    method: metodo,
    headers: {
      apikey: servico ? SERVICE_KEY : ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: metodo === 'GET' ? 'count=none' : 'return=representation',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = r.status === 204 ? null : await r.json().catch(() => null);
  return { status: r.status, ok: r.ok, dados };
}

async function perfilPorId(id) {
  const r = await postgrest(`/perfis?id=eq.${encodeURIComponent(id)}&select=*`, { servico: true });
  return (r.dados && r.dados[0]) || null;
}

/* ------------------------------------------- JWT (HS256) */
function assinarJWT(payload, horas = 24 * 7) {
  const agora = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({ ...payload, iat: agora, exp: agora + horas * 3600 })).toString('base64url');
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

function verificarJWT(token) {
  try {
    const [h, b, s] = String(token || '').split('.');
    if (!h || !b || !s) return null;
    const esperado = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    const sb = Buffer.from(s), eb = Buffer.from(esperado);
    if (sb.length !== eb.length || !crypto.timingSafeEqual(sb, eb)) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) { return null; }
}

/* ------------------------------------------- cookies */
function lerCookies(req) {
  const out = {};
  const raw = (req.headers && req.headers.cookie) || '';
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function cookieSessao(token) {
  const partes = [
    `sessao=${encodeURIComponent(token)}`,
    'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${7 * 24 * 3600}`,
  ];
  if (process.env.VERCEL) partes.push('Secure');
  return partes.join('; ');
}

function cookieApagar() {
  const partes = ['sessao=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.VERCEL) partes.push('Secure');
  return partes.join('; ');
}

/* usuário da requisição (payload do cookie) ou null */
function usuarioDaRequisicao(req) {
  return verificarJWT(lerCookies(req).sessao);
}

/* ------------------------------------------------- validações */
function normalizarWhats(valor) {
  let d = String(valor || '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
}

function validarCadastro({ nome, email, senha, whatsapp }) {
  if (!nome || String(nome).trim().length < 3) return 'Informe seu nome completo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) return 'E-mail inválido.';
  if (!senha || String(senha).length < 6) return 'A senha precisa de ao menos 6 caracteres.';
  const whats = normalizarWhats(whatsapp);
  if (whats.length < 10 || whats.length > 11 || whats[0] === '0')
    return 'Informe o WhatsApp com DDD (ex.: 11 98765-4321).';
  return null;
}

module.exports = {
  json, envFaltando, gotrue, postgrest, perfilPorId,
  assinarJWT, verificarJWT, lerCookies, cookieSessao, cookieApagar,
  usuarioDaRequisicao, normalizarWhats, validarCadastro,
  APP_URL,
};
