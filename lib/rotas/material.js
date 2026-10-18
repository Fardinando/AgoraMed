/* GET /api/material?id=<material> — entrega o PDF do Storage só para quem tem acesso.
   O arquivo fica privado no Supabase; o navegador só fala com o nosso servidor. */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, estaMatriculado, env } = require('../api');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });

  const perfil = await sessaoPerfil(req);
  if (!perfil) return json(res, 401, { ok: false, erro: 'Faça login para acessar os materiais.' });

  const id = String(req.query.id || '');
  if (!id) return json(res, 400, { ok: false, erro: 'Material não informado.' });

  const rm = await postgrest(
    `/materiais?id=eq.${encodeURIComponent(id)}&select=*,aulas(modulos(curso_id))`,
    { servico: true }
  );
  const mat = (rm.dados || [])[0];
  if (!mat) return json(res, 404, { ok: false, erro: 'Material não encontrado.' });

  const cursoId = mat.aulas && mat.aulas.modulos && mat.aulas.modulos.curso_id;
  if (perfil.papel !== 'admin' && !(await estaMatriculado(perfil.id, cursoId)))
    return json(res, 403, { ok: false, erro: 'Sem acesso a este curso.' });

  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/materiais/${mat.caminho}`, {
    headers: { apikey: env.SERVICE_KEY, Authorization: `Bearer ${env.SERVICE_KEY}` },
  });
  if (!r.ok) return json(res, 404, { ok: false, erro: 'Arquivo indisponível.' });

  const buf = Buffer.from(await r.arrayBuffer());
  const ehPdf = String(mat.nome || '').toLowerCase().endsWith('.pdf');
  res.statusCode = 200;
  res.setHeader('Content-Type', ehPdf ? 'application/pdf' : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${ehPdf ? 'inline' : 'attachment'}; filename="${encodeURIComponent(mat.nome || 'material')}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.end(buf);
};
