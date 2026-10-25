/* GET /api/admin/progresso?usuario_id=... — progresso atual do aluno, apenas para professores. */
'use strict';
const { json, envFaltando, exigirAdmin, postgrest } = require('../../api');

async function lerConclusoes(uid) {
  const linhas = [];
  const tamanho = 1000;
  for (let offset = 0; ; offset += tamanho) {
    const r = await postgrest(`/progresso?usuario_id=eq.${uid}&select=aula_id&order=aula_id&limit=${tamanho}&offset=${offset}`, { servico: true });
    if (!r.ok || !Array.isArray(r.dados)) throw new Error('Falha ao consultar conclusões.');
    linhas.push(...r.dados);
    if (r.dados.length < tamanho) return linhas;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  if (envFaltando().length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.' });
  const admin = await exigirAdmin(req, res);
  if (!admin) return;

  const uid = req.query && req.query.usuario_id;
  if (typeof uid !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))
    return json(res, 400, { ok: false, erro: 'Aluno inválido.' });

  try {
    const [rp, rm, conclusoes, rg] = await Promise.all([
      postgrest(`/perfis?id=eq.${uid}&select=id,nome,email,papel&limit=1`, { servico: true }),
      postgrest(`/matriculas?usuario_id=eq.${uid}&select=curso:cursos(id,titulo,modulos(aulas(id)))`, { servico: true }),
      lerConclusoes(uid),
      postgrest('/cursos?tipo_acesso=eq.gratis&select=id,titulo,modulos(aulas(id))', { servico: true }),
    ]);
    if (!rp.ok || !rm.ok || !rg.ok || !Array.isArray(rp.dados) || !Array.isArray(rm.dados) || !Array.isArray(rg.dados))
      throw new Error('Falha ao consultar matrícula.');
    const aluno = rp.dados[0];
    if (!aluno) return json(res, 404, { ok: false, erro: 'Aluno não encontrado.' });
    const concluidas = new Set(conclusoes.map(x => x.aula_id));
    const disponiveis = new Map(rg.dados.map(c => [c.id, c]));
    rm.dados.filter(m => m.curso).forEach(m => disponiveis.set(m.curso.id, m.curso));
    const cursos = [...disponiveis.values()].map(curso => {
      const aulas = new Set((curso.modulos || []).flatMap(m => (m.aulas || []).map(a => a.id)));
      const feitas = [...aulas].filter(id => concluidas.has(id)).length;
      return { id: curso.id, titulo: curso.titulo, total: aulas.size, feitas, percentual: aulas.size ? Math.round(feitas / aulas.size * 100) : 0 };
    }).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    return json(res, 200, { ok: true, aluno: { id: aluno.id, nome: aluno.nome, email: aluno.email }, cursos });
  } catch (e) {
    return json(res, 503, { ok: false, erro: 'Não foi possível consultar o progresso agora. Tente atualizar.' });
  }
};
