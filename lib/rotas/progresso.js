/* POST /api/progresso — marca/desmarca uma aula como concluída. */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, cursoDaAula, podeAcessarCurso } = require('../api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const perfil = await sessaoPerfil(req);
  if (!perfil) return json(res, 200, { ok: false, erro: 'Sem sessão.' });

  const { aula_id, acao } = req.body || {};
  if (!aula_id) return json(res, 200, { ok: false, erro: 'Aula não informada.' });
  const cursoId = await cursoDaAula(aula_id);
  if (!(await podeAcessarCurso(perfil, cursoId)))
    return json(res, 403, { ok: false, erro: 'Sem acesso a este curso.' });

  const tipo = await postgrest(`/aulas?id=eq.${encodeURIComponent(aula_id)}&select=atividade&limit=1`, { servico: true });
  if (!tipo.ok || !Array.isArray(tipo.dados)) return json(res, 503, { ok: false, erro: 'Não foi possível verificar a aula.' });
  if (tipo.dados[0]?.atividade) return json(res, 409, { ok: false, erro: 'A conclusão do AgoraQuiz é registrada ao finalizar a atividade.' });

  const filtro = `/progresso?usuario_id=eq.${perfil.id}&aula_id=eq.${encodeURIComponent(aula_id)}`;
  const marcar = acao !== 'desmarcar';

  if (marcar) {
    /* UPSERT — garante que o registro exista mesmo se um INSERT anterior falhou */
    const ins = await postgrest('/progresso', {
      metodo: 'POST', servico: true, upsert: true,
      corpo: { usuario_id: perfil.id, aula_id },
    });
    if (!ins.ok) return json(res, 200, { ok: false, erro: 'Não foi possível marcar. (' + ins.status + ')' });
  } else {
    /* DELETE — se não existir, não é erro (estado já é "não concluída") */
    const apagado = await postgrest(filtro, { metodo: 'DELETE', servico: true });
    if (!apagado.ok) return json(res, 503, { ok: false, erro: 'Não foi possível desmarcar a aula.' });
  }

  /* sempre devolve o estado real do banco para o frontend sincronizar */
  const depois = await postgrest(`${filtro}&select=usuario_id`, { servico: true });
  if (!depois.ok || !Array.isArray(depois.dados))
    return json(res, 503, { ok: false, erro: 'Não foi possível confirmar o progresso.' });
  const existeAgora = Array.isArray(depois.dados) && depois.dados.length > 0;
  return json(res, 200, { ok: true, concluida: existeAgora });
};
