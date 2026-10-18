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

  const cursoId = await cursoDaAula(aula_id);
  if (!cursoId) return json(res, 200, { ok: false, erro: 'Aula não encontrada.' });
  if (perfil.papel !== 'admin' && !(await estaMatriculado(perfil.id, cursoId)))
    return json(res, 200, { ok: false, erro: 'Sem acesso a este curso.' });

  const existe = await postgrest(
    `/progresso?usuario_id=eq.${perfil.id}&aula_id=eq.${encodeURIComponent(aula_id)}&select=id`,
    { servico: true }
  );
  const atual = (existe.dados || [])[0];
  const marcar = acao !== 'desmarcar';

  if (marcar && !atual) {
    await postgrest('/progresso', {
      metodo: 'POST', servico: true,
      corpo: { usuario_id: perfil.id, aula_id },
    });
  } else if (!marcar && atual) {
    await postgrest(`/progresso?id=eq.${atual.id}`, { metodo: 'DELETE', servico: true });
  }

  return json(res, 200, { ok: true, concluida: marcar });
};
