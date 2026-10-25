/* Resolve o clique pelo acesso atual, inclusive quando a capa veio de cache. */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  if (envFaltando().length) return json(res, 503, { ok: false, erro: 'Serviço indisponível.' });
  const perfil = await sessaoPerfil(req);
  if (!perfil) { res.statusCode = 302; res.setHeader('Location', '/index.html'); return res.end(); }
  const id = req.query && req.query.id;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return json(res, 400, { ok: false, erro: 'Curso inválido.' });
  const r = await postgrest(`/cursos?id=eq.${id}&select=id,url_vendas`, { servico: true });
  if (!r.ok || !Array.isArray(r.dados)) return json(res, 503, { ok: false, erro: 'Não foi possível abrir o curso agora.' });
  const curso = r.dados[0];
  if (!curso) return json(res, 404, { ok: false, erro: 'Curso não encontrado.' });
  let destino;
  if (await podeAcessarCurso(perfil, id)) destino = `/curso.html?id=${id}&atualizar=1`;
  else {
    try {
      const url = new URL(curso.url_vendas);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error();
      destino = url.href;
    } catch (e) { return json(res, 404, { ok: false, erro: 'A página de vendas deste curso ainda não está disponível.' }); }
  }
  res.statusCode = 302;
  res.setHeader('Location', destino);
  return res.end();
};
