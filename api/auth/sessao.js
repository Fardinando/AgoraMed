/* GET /api/auth/sessao — devolve o usuário da sessão atual (cookie httpOnly) */
'use strict';
const { json, envFaltando, usuarioDaRequisicao, perfilPorId } = require('../../lib/api');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const sessao = usuarioDaRequisicao(req);
  if (!sessao) return json(res, 200, { ok: false, erro: 'Sem sessão.' });

  const perfil = await perfilPorId(sessao.sub);
  if (!perfil || !perfil.liberado) return json(res, 200, { ok: false, erro: 'Sem sessão.' });

  return json(res, 200, {
    ok: true,
    usuario: { id: perfil.id, nome: perfil.nome, email: perfil.email, papel: perfil.papel },
  });
};
