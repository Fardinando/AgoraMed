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

  const existe = await postgrest(
    `/progresso?usuario_id=eq.${perfil.id}&aula_id=eq.${encodeURIComponent(aula_id)}&select=usuario_id`,
    { servico: true }
  );
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
  } else if (!marcar && !atual) {
    /* registro não encontrado — pode ser que o usuario_id não bata */
    return json(res, 200, { ok: true, concluida: false, diag: 'nao-encontrado: perfil.id=' + perfil.id + ' aula_id=' + aula_id + ' existe.dados=' + JSON.stringify(existe.dados).slice(0, 200) });
  }

  return json(res, 200, { ok: true, concluida: marcar });
};
