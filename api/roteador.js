/* ============================================================
   AGORAMED — ÚNICA função serverless do site (plano Hobby: máx. 12).
   O vercel.json reescreve /api/* inteiro para cá com ?rota=<caminho>
   (projetos plain não têm catch-all no /api). Mesmas URLs de sempre:
   /api/auth/entrar, /api/app, /api/admin/cursos…
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
  'admin/progresso': require('../lib/rotas/admin/progresso'),
  'admin/promos': require('../lib/rotas/admin/promos'),
};

/* nome do handler: vem do query ?rota= (do rewrite); se faltar,
   a URL é analisada manualmente (/api/auth/entrar → 'auth/entrar') */
function chaveDe(req) {
  const p = req.query && req.query.rota;
  if (Array.isArray(p) && p.length) return p.join('/');
  if (typeof p === 'string' && p) {
    try { return decodeURIComponent(p).replace(/^\/+|\/+$/g, ''); } catch (e) { return p.replace(/^\/+|\/+$/g, ''); }
  }
  const m = /^\/api\/([^?]+)/.exec(req.url || '');
  return m ? decodeURIComponent(m[1]).replace(/\/+$/, '') : '';
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const handler = rotas[chaveDe(req)];
  if (!handler) return json(res, 404, { ok: false, erro: 'Rota não encontrada.' });
  return handler(req, res);
};
