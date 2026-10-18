/* Comentários de uma aula — GET lista, POST publica, DELETE apaga (autor ou professor). */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, cursoDaAula, estaMatriculado } = require('../lib/api');

async function podeVer(perfil, cursoId) {
  return perfil.papel === 'admin' || (await estaMatriculado(perfil.id, cursoId));
}

module.exports = async (req, res) => {
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const perfil = await sessaoPerfil(req);
  if (!perfil) return json(res, 200, { ok: false, erro: 'Sem sessão.' });

  if (req.method === 'GET') {
    const aulaId = String(req.query.aula || '');
    const cursoId = aulaId && await cursoDaAula(aulaId);
    if (!cursoId) return json(res, 200, { ok: false, erro: 'Aula não encontrada.' });
    if (!(await podeVer(perfil, cursoId))) return json(res, 200, { ok: false, erro: 'Sem acesso a este curso.' });

    const rc = await postgrest(
      `/comentarios?aula_id=eq.${encodeURIComponent(aulaId)}&select=*,perfis(nome,papel)&order=criado_em.asc`,
      { servico: true }
    );
    const comentarios = (rc.dados || []).map((c) => ({
      id: c.id,
      userId: c.usuario_id,
      texto: c.texto,
      ts: Date.parse(c.criado_em) || Date.now(),
      nome: (c.perfis && c.perfis.nome) || '',
      papel: (c.perfis && c.perfis.papel) || 'aluno',
    }));
    return json(res, 200, { ok: true, comentarios });
  }

  if (req.method === 'POST') {
    const { aula_id, texto } = req.body || {};
    const limpo = String(texto || '').trim();
    const cursoId = aula_id && await cursoDaAula(aula_id);
    if (!cursoId) return json(res, 200, { ok: false, erro: 'Aula não encontrada.' });
    if (!limpo) return json(res, 200, { ok: false, erro: 'Escreva seu comentário antes de publicar.' });
    if (!(await podeVer(perfil, cursoId))) return json(res, 200, { ok: false, erro: 'Sem acesso a este curso.' });

    const ri = await postgrest('/comentarios', {
      metodo: 'POST', servico: true,
      corpo: { usuario_id: perfil.id, aula_id, texto: limpo.slice(0, 3000) },
    });
    if (!ri.ok) return json(res, 200, { ok: false, erro: 'Não foi possível publicar o comentário.' });

    return json(res, 200, {
      ok: true,
      comentario: {
        id: (ri.dados && ri.dados[0] && ri.dados[0].id) || null,
        userId: perfil.id, nome: perfil.nome, papel: perfil.papel,
        texto: limpo, ts: Date.now(),
      },
    });
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    if (!id) return json(res, 200, { ok: false, erro: 'Comentário não informado.' });
    const rc = await postgrest(`/comentarios?id=eq.${encodeURIComponent(id)}&select=id,usuario_id`, { servico: true });
    const c = (rc.dados || [])[0];
    if (!c) return json(res, 200, { ok: true });
    if (c.usuario_id !== perfil.id && perfil.papel !== 'admin')
      return json(res, 200, { ok: false, erro: 'Sem permissão para excluir.' });
    await postgrest(`/comentarios?id=eq.${id}`, { metodo: 'DELETE', servico: true });
    return json(res, 200, { ok: true });
  }

  return json(res, 405, { ok: false, erro: 'Método não permitido.' });
};
