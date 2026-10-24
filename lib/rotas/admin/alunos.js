/* GET  /api/admin/alunos — lista de perfis + matrículas (professor).
   POST /api/admin/alunos — ações: liberar | bloquear | cursos | remover | promover | rebaixar. */
'use strict';
const { json, envFaltando, exigirAdmin, postgrest, gotrue } = require('../../api');

module.exports = async (req, res) => {
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });
  const admin = await exigirAdmin(req, res);
  if (!admin) return undefined;

  if (req.method === 'GET') {
    const ra = await postgrest('/perfis?select=*&order=criado_em.asc', { servico: true });
    const rm = await postgrest('/matriculas?select=*', { servico: true });
    return json(res, 200, { ok: true, usuarios: ra.dados || [], matriculas: rm.dados || [] });
  }

  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });

  const { usuario_id: uid, acao, cursos } = req.body || {};
  if (!uid || !acao) return json(res, 200, { ok: false, erro: 'Ação incompleta.' });

  /* O Auth é a origem da conta. As FKs ON DELETE CASCADE removem o perfil
     e seus vínculos na mesma transação. Uma falha preserva o cadastro inteiro. */
  if (acao === 'remover') {
    if (uid === admin.id) return json(res, 200, { ok: false, erro: 'Você não pode excluir a própria conta.' });
    try {
      const r = await gotrue(`/admin/users/${encodeURIComponent(uid)}`, {
        metodo: 'DELETE', servico: true, corpo: { should_soft_delete: false },
      });
      if (!r || !r.ok)
        return json(res, 200, { ok: false, erro: 'Não foi possível excluir a conta do aluno. O cadastro foi preservado. Tente novamente.' });
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 200, { ok: false, erro: 'Não foi possível excluir a conta do aluno. Verifique a conexão e tente novamente.' });
    }
  }

  const alvo = await postgrest(`/perfis?id=eq.${encodeURIComponent(uid)}&select=*`, { servico: true });
  const u = (alvo.dados || [])[0];
  if (!u) return json(res, 200, { ok: false, erro: 'Aluno não encontrado.' });

  if (acao === 'liberar' || acao === 'bloquear') {
    await postgrest(`/perfis?id=eq.${uid}`, {
      metodo: 'PATCH', servico: true, corpo: { liberado: acao === 'liberar' },
    });
    return json(res, 200, { ok: true });
  }

  if (acao === 'promover' || acao === 'rebaixar') {
    if (acao === 'rebaixar') {
      if (uid === admin.id)
        return json(res, 200, { ok: false, erro: 'Você não pode rebaixar a própria conta.' });
      const contar = await postgrest('/perfis?papel=eq.admin&select=id', { servico: true });
      const admins = (contar.dados || []).length;
      if (u.papel === 'admin' && admins <= 1)
        return json(res, 200, { ok: false, erro: 'A plataforma precisa de pelo menos um professor.' });
    }
    await postgrest(`/perfis?id=eq.${uid}`, {
      metodo: 'PATCH', servico: true,
      corpo: { papel: acao === 'promover' ? 'admin' : 'aluno', ...(acao === 'promover' ? { liberado: true } : {}) },
    });
    return json(res, 200, { ok: true });
  }

  if (acao === 'cursos') {
    const lista = Array.isArray(cursos) ? cursos : [];
    await postgrest(`/matriculas?usuario_id=eq.${uid}`, { metodo: 'DELETE', servico: true });
    for (const cid of lista)
      await postgrest('/matriculas', { metodo: 'POST', servico: true, corpo: { usuario_id: uid, curso_id: cid } });
    if (req.body && req.body.liberar && u.papel !== 'admin') {
      await postgrest(`/perfis?id=eq.${uid}`, {
        metodo: 'PATCH', servico: true, corpo: { liberado: true },
      });
    }
    return json(res, 200, { ok: true });
  }

  return json(res, 200, { ok: false, erro: 'Ação desconhecida.' });
};
