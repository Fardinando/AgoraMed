/* GET /api/material?id=<material> — entrega o PDF do Storage só para quem tem acesso.
   O arquivo fica privado no Supabase; o servidor confere o acesso e autoriza a abertura por tempo limitado. */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso, storage, env } = require('../api');

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
  if (!(await podeAcessarCurso(perfil, cursoId)))
    return json(res, 403, { ok: false, erro: 'Sem acesso a este curso.' });

  /* O acesso é conferido acima; o arquivo usa um link privado de curta duração.
     Assim PDFs grandes não atravessam o limite de resposta da função Vercel. */
  const caminho = String(mat.caminho).split('/').map(encodeURIComponent).join('/');
  const r = await storage('POST', `object/sign/materiais/${caminho}`, {
    contentType: 'application/json', corpo: JSON.stringify({ expiresIn: 300 }),
  });
  if (!r.ok || typeof r.dados?.signedURL !== 'string')
    return json(res, 503, { ok: false, erro: 'Arquivo indisponível. Tente novamente.' });
  const destino = new URL(env.SUPABASE_URL + '/storage/v1' + r.dados.signedURL);
  if (destino.origin !== new URL(env.SUPABASE_URL).origin || !destino.pathname.startsWith('/storage/v1/object/sign/materiais/'))
    return json(res, 503, { ok: false, erro: 'Arquivo indisponível.' });
  destino.searchParams.set('download', String(mat.nome || 'material.pdf'));
  res.statusCode = 302;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Location', destino.href);
  res.end();
};
