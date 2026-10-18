/* GET /api/app — tudo que a interface precisa após o login.
   Aluno: só os cursos matriculados. Professor: tudo + alunos + matrículas. */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, cursoParaEd, promoParaEd } = require('../api');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const perfil = await sessaoPerfil(req);
  if (!perfil) return json(res, 200, { ok: false, erro: 'Sem sessão.' });
  const ehAdmin = perfil.papel === 'admin';

  const rc = await postgrest('/cursos?select=*,modulos(*,aulas(*,materiais(*)))&order=criado_em.asc', { servico: true });
  let cursos = (rc.dados || []).map(cursoParaEd);

  let matriculas = [];
  if (ehAdmin) {
    const rm = await postgrest('/matriculas?select=*', { servico: true });
    matriculas = rm.dados || [];
  } else {
    const rm = await postgrest(`/matriculas?usuario_id=eq.${perfil.id}&select=curso_id`, { servico: true });
    const ids = new Set((rm.dados || []).map((m) => m.curso_id));
    cursos = cursos.filter((c) => ids.has(c.id));
  }

  const rp = await postgrest(`/progresso?usuario_id=eq.${perfil.id}&select=aula_id`, { servico: true });
  const rv = await postgrest('/promos?ativo=eq.true&select=*&order=ordem.asc', { servico: true });

  let alunos = [];
  if (ehAdmin) {
    const ra = await postgrest('/perfis?select=*&order=criado_em.asc', { servico: true });
    alunos = ra.dados || [];
  }

  return json(res, 200, {
    ok: true,
    usuario: {
      id: perfil.id, nome: perfil.nome, email: perfil.email,
      whatsapp: perfil.whatsapp, papel: perfil.papel,
    },
    cursos,
    progresso: (rp.dados || []).map((x) => x.aula_id),
    promos: (rv.dados || []).map(promoParaEd),
    alunos,
    matriculas,
  });
};
