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
async function postgrest(caminho, { metodo = 'GET', corpo, token, servico = false, upsert = false } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${caminho}`, {
    method: metodo,
    headers: {
      apikey: servico ? SERVICE_KEY : ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: metodo === 'GET' ? 'count=none'
        : (upsert ? 'resolution=merge-duplicates, return=representation' : 'return=representation'),
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

/* ------------------------------------------------ sessão/admin */
/* perfil completo do usuário logado (ou null) */
async function sessaoPerfil(req) {
  const s = usuarioDaRequisicao(req);
  if (!s) return null;
  const perfil = await perfilPorId(s.sub);
  if (!perfil || !perfil.liberado) return null;
  return perfil;
}

/* exige professor(a); responde e retorna null quando não autorizado */
async function exigirAdmin(req, res) {
  const perfil = await sessaoPerfil(req);
  if (!perfil) { json(res, 200, { ok: false, erro: 'Sem sessão.' }); return null; }
  if (perfil.papel !== 'admin') { json(res, 200, { ok: false, erro: 'Área restrita ao professor.' }); return null; }
  return perfil;
}

/* matrícula ativa de um usuário em um curso? */
async function estaMatriculado(usuarioId, cursoId) {
  const r = await postgrest(
    `/matriculas?usuario_id=eq.${encodeURIComponent(usuarioId)}&curso_id=eq.${encodeURIComponent(cursoId)}&select=id`,
    { servico: true }
  );
  return !!(r.dados || []).length;
}

/* aula → curso_id (ou null) */
async function cursoDaAula(aulaId) {
  const r = await postgrest(
    `/aulas?id=eq.${encodeURIComponent(aulaId)}&select=id,modulos(curso_id)`,
    { servico: true }
  );
  const aula = (r.dados || [])[0];
  return aula && aula.modulos ? aula.modulos.curso_id : null;
}

/* ------------------------------------------------ Storage */
/* operação direta na API de Storage (só no servidor) */
async function storage(metodo, caminho, { corpo, contentType, upsert } = {}) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...(upsert ? { 'x-upsert': 'true' } : {}),
    },
    body: corpo === undefined ? undefined : corpo,
  });
  const dados = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, dados };
}

async function apagarStorage(bucket, caminho) {
  await storage('DELETE', `object/${bucket}/${caminho}`);
}

/* ---------------------------------------- formatos do frontend */
/* linha do banco → objeto que as páginas já conhecem */
function cursoParaEd(c) {
  return {
    id: c.id,
    titulo: c.titulo,
    subtitulo: c.subtitulo || '',
    categoria: c.categoria || '',
    nivel: c.nivel || 'Básico',
    descricao: c.descricao || '',
    capaEmoji: c.capa_emoji || '🩺',
    capaImagem: c.capa_url || '',
    modulos: (c.modulos || [])
      .slice().sort((a, b) => a.ordem - b.ordem)
      .map((m) => ({
        id: m.id,
        titulo: m.titulo,
        aulas: (m.aulas || [])
          .slice().sort((a, b) => a.ordem - b.ordem)
          .map((a) => ({
            id: a.id,
            titulo: a.titulo,
            youtubeId: a.youtube_id || '',
            duracao: a.duracao || '',
            descricao: a.descricao || '',
            pdfs: (a.materiais || []).map((p) => ({ id: p.id, nome: p.nome, caminho: p.caminho })),
          })),
      })),
  };
}

function promoParaEd(p) {
  return {
    id: p.id, titulo: p.titulo || '', texto: p.texto || '',
    emoji: p.emoji || '🎓', link: p.link || '', capaImagem: p.imagem_url || '',
  };
}

/* dataURL ("data:image/png;base64,...") → bytes */
function dataUrlParaBytes(dataUrl) {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const dados = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
  return { mime: m[1] || 'application/octet-stream', dados };
}

module.exports = {
  json, envFaltando, gotrue, postgrest, perfilPorId,
  assinarJWT, verificarJWT, lerCookies, cookieSessao, cookieApagar,
  usuarioDaRequisicao, normalizarWhats, validarCadastro,
  sessaoPerfil, exigirAdmin, estaMatriculado, cursoDaAula,
  storage, apagarStorage, cursoParaEd, promoParaEd, dataUrlParaBytes,
  env: { SUPABASE_URL, ANON_KEY, SERVICE_KEY },
  APP_URL,
};
