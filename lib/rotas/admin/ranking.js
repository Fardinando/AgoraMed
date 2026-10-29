/* GET /api/admin/ranking?curso_id=... — nunca expõe dados de alunos fora do painel. */
'use strict';
const { json, envFaltando, exigirAdmin, postgrest } = require('../../api');
async function lerPaginas(caminho, visitar) {
  const tamanho = 1000;
  for (let offset = 0; ; offset += tamanho) {
    const r = await postgrest(`${caminho}&limit=${tamanho}&offset=${offset}`, { servico: true });
    if (!r.ok || !Array.isArray(r.dados)) throw Error('Consulta indisponível.');
    visitar(r.dados);
    if (r.dados.length < tamanho) return;
  }
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  if (envFaltando().length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.' });
  if (!await exigirAdmin(req, res)) return;
  const cid = req.query && req.query.curso_id;
  if (typeof cid !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid))
    return json(res, 400, { ok: false, erro: 'Selecione um curso válido.' });
  try {
    const rc = await postgrest(`/cursos?id=eq.${cid}&select=id,titulo,tipo_acesso&limit=1`, { servico: true });
    if (!rc.ok || !Array.isArray(rc.dados)) throw Error('Curso indisponível.');
    const curso = rc.dados[0];
    if (!curso) return json(res, 404, { ok: false, erro: 'Curso não encontrado.' });
    const aulas = new Set(), alunos = new Map(), matriculados = new Set();
    await Promise.all([
      lerPaginas(`/aulas?select=id,modulos!inner(curso_id)&modulos.curso_id=eq.${cid}&order=id.asc`, rows => rows.forEach(a => aulas.add(a.id))),
      lerPaginas('/perfis?papel=eq.aluno&liberado=eq.true&select=id,nome&order=id.asc', rows => rows.forEach(a => alunos.set(a.id, a))),
      curso.tipo_acesso === 'gratis' ? Promise.resolve() : lerPaginas(`/matriculas?curso_id=eq.${cid}&select=usuario_id&order=usuario_id.asc`, rows => rows.forEach(m => matriculados.add(m.usuario_id))),
    ]);
    if (curso.tipo_acesso !== 'gratis') for (const id of alunos.keys()) if (!matriculados.has(id)) alunos.delete(id);
    const concluidas = new Map();
    if (aulas.size && alunos.size) {
      await lerPaginas(`/progresso?select=usuario_id,aula_id,aulas!inner(modulos!inner(curso_id))&aulas.modulos.curso_id=eq.${cid}&order=usuario_id.asc,aula_id.asc`, rows => {
        for (const p of rows) {
          if (!alunos.has(p.usuario_id) || !aulas.has(p.aula_id)) continue;
          if (!concluidas.has(p.usuario_id)) concluidas.set(p.usuario_id, new Set());
          concluidas.get(p.usuario_id).add(p.aula_id);
        }
      });
    }
    const ranking = [...concluidas].map(([id, feitas]) => ({ id, nome: alunos.get(id).nome, feitas: feitas.size, total: aulas.size, percentual: Math.round(feitas.size / aulas.size * 100) }))
      .sort((a, b) => b.feitas - a.feitas || a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id))
      .slice(0, 3);
    return json(res, 200, { ok: true, curso: { id: curso.id, titulo: curso.titulo, total: aulas.size }, ranking });
  } catch {
    return json(res, 503, { ok: false, erro: 'Não foi possível carregar o ranking. Tente atualizar.' });
  }
};
