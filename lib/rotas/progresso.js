/* POST /api/progresso — marca/desmarca uma aula como concluída. */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, cursoDaAula, estaMatriculado } = require('../api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const perfil = await sessaoPerfil(req);
  if (!perfil) return json(res, 200, { ok: false, erro: 'Sem sessão.' });

  const { aula_id, acao } = req.body || {};
  if (!aula_id) return json(res, 200, { ok: false, erro: 'Aula não informada.' });

  /* cursoDaAula e a consulta de progresso são independentes — paralelo */
  const [cursoId, existe] = await Promise.all([
    cursoDaAula(aula_id),
    postgrest(
      `/progresso?usuario_id=eq.${perfil.id}&aula_id=eq.${encodeURIComponent(aula_id)}&select=usuario_id`,
      { servico: true }
    ),
  ]);
  if (!cursoId) return json(res, 200, { ok: false, erro: 'Aula não encontrada.' });
  if (perfil.papel !== 'admin' && !(await estaMatriculado(perfil.id, cursoId)))
    return json(res, 200, { ok: false, erro: 'Sem acesso a este curso.' });
  const atual = (Array.isArray(existe.dados) && existe.dados.length > 0) ? existe.dados[0] : null;
  const marcar = acao !== 'desmarcar';

  if (marcar && !atual) {
    const ins = await postgrest('/progresso', {
      metodo: 'POST', servico: true,
      corpo: { usuario_id: perfil.id, aula_id },
    });
    if (!ins.ok) return json(res, 200, { ok: false, erro: 'Não foi possível marcar. (' + ins.status + ' ' + JSON.stringify(ins.dados || '').slice(0, 120) + ')' });
  } else if (!marcar && atual) {
    const del = await postgrest(`/progresso?usuario_id=eq.${perfil.id}&aula_id=eq.${encodeURIComponent(aula_id)}`, { metodo: 'DELETE', servico: true });
    if (!del.ok) return json(res, 200, { ok: false, erro: 'Não foi possível desmarcar. (' + del.status + ' ' + JSON.stringify(del.dados || '').slice(0, 120) + ')' });
  }

  return json(res, 200, { ok: true, concluida: marcar });
};
