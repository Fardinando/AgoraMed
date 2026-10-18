/* GET /api/auth/sessao — devolve o usuário da sessão atual (cookie httpOnly) */
'use strict';
const { json, envFaltando, usuarioDaRequisicao, perfilPorId, postgrest } = require('../../api');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const sessao = usuarioDaRequisicao(req);
  if (!sessao) {
    /* [diagnóstico temporário] testa a leitura do banco sem sessão */
    const b = await postgrest('/perfis?select=id&limit=1', { servico: true })
      .catch((e) => ({ status: 0, dados: String(e && e.message || e) }));
    const corpo = { ok: false, erro: 'Sem sessão.' };
    if (b.status !== 200) corpo.diag = { banco: b.status, detalhe: String(JSON.stringify(b.dados || '')).slice(0, 200) };
    else corpo.diag = { banco: b.status, linhas: Array.isArray(b.dados) ? b.dados.length : -1 };
    return json(res, 200, corpo);
  }

  const perfil = await perfilPorId(sessao.sub);
  if (!perfil || !perfil.liberado) return json(res, 200, { ok: false, erro: 'Sem sessão.' });

  return json(res, 200, {
    ok: true,
    usuario: { id: perfil.id, nome: perfil.nome, email: perfil.email, papel: perfil.papel },
  });
};
