/* ============================================================
   AGORAMED — ÚNICA função serverless do site (plano Hobby: máx. 12).
   Recebe /api/* inteiro e despacha para o handler interno certo.
   As URLs continuam as mesmas: /api/auth/entrar, /api/app, /api/admin/cursos…
   ============================================================ */
'use strict';
const { json } = require('../lib/api');

const rotas = {
  'auth/cadastro': require('../lib/rotas/auth/cadastro'),
  'auth/entrar': require('../lib/rotas/auth/entrar'),
  'auth/sair': require('../lib/rotas/auth/sair'),
  'auth/sessao': require('../lib/rotas/auth/sessao'),
  'auth/esqueci-senha': require('../lib/rotas/auth/esqueci-senha'),
  'auth/redefinir-senha': require('../lib/rotas/auth/redefinir-senha'),
  'app': require('../lib/rotas/app'),
  'progresso': require('../lib/rotas/progresso'),
  'comentarios': require('../lib/rotas/comentarios'),
  'material': require('../lib/rotas/material'),
  'admin/cursos': require('../lib/rotas/admin/cursos'),
  'admin/alunos': require('../lib/rotas/admin/alunos'),
  'admin/promos': require('../lib/rotas/admin/promos'),
};

/* nome do handler: vem do parâmetro de rota; se o runtime não o preencher,
   a URL é analisada manualmente (/api/auth/entrar → 'auth/entrar') */
function chaveDe(req) {
  const p = req.query && req.query.rota;
  if (Array.isArray(p) && p.length) return p.join('/');
  if (typeof p === 'string' && p) return p;
  const m = /^\/api\/([^?]+)/.exec(req.url || '');
  return m ? decodeURIComponent(m[1]).replace(/\/+$/, '') : '';
}

module.exports = async (req, res) => {
  const handler = rotas[chaveDe(req)];
  if (!handler) return json(res, 404, { ok: false, erro: 'Rota não encontrada.' });
  return handler(req, res);
};
