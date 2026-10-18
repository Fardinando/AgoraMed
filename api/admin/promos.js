/* POST /api/admin/promos — substitui a lista de divulgações inteira (simples e atômico).
   A imagem da capa viaja como dataURL e vira arquivo no bucket `capas`. */
'use strict';
const { randomUUID } = require('crypto');
const { json, envFaltando, exigirAdmin, postgrest, storage, apagarStorage, dataUrlParaBytes, env } = require('../../lib/api');

module.exports = async (req, res) => {
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });
  const admin = await exigirAdmin(req, res);
  if (!admin) return undefined;

  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });

  const lista = Array.isArray((req.body || {}).lista) ? req.body.lista : [];
  const antigas = (await postgrest('/promos?select=imagem_url', { servico: true })).dados || [];
  const ids = new Set();

  /* apaga tudo e recria (o volume é pequeno e o painel envia a lista completa) */
  await postgrest('/promos', { metodo: 'DELETE', servico: true });
  for (const a of antigas)
    if (a.imagem_url && a.imagem_url.includes('/storage/v1/object/public/capas/'))
      await apagarStorage('capas', a.imagem_url.split('/object/public/capas/')[1]);

  for (let i = 0; i < lista.length; i++) {
    const p = lista[i] || {};
    const id = p.id || randomUUID();
    ids.add(id);

    let imagemUrl = '';
    if (String(p.capaImagem || '').startsWith('data:')) {
      const b = dataUrlParaBytes(p.capaImagem);
      if (b) {
        const caminho = `${id}.promo.${b.mime.includes('png') ? 'png' : 'jpg'}`;
        const r = await storage('POST', `object/capas/${caminho}`, { corpo: b.dados, contentType: b.mime, upsert: true });
        if (r.ok) imagemUrl = `${env.SUPABASE_URL}/storage/v1/object/public/capas/${caminho}`;
      }
    }

    const ri = await postgrest('/promos', {
      metodo: 'POST', servico: true,
      corpo: {
        id,
        titulo: String(p.titulo || 'Divulgação').trim().slice(0, 140),
        texto: String(p.texto || '').trim().slice(0, 500),
        emoji: String(p.emoji || '🎓').slice(0, 8),
        link: String(p.link || '').trim().slice(0, 500),
        imagem_url: imagemUrl,
        ordem: i + 1,
        ativo: true,
      },
    });
    if (!ri.ok) return json(res, 200, { ok: false, erro: 'Não foi possível salvar a divulgação.' });
  }

  return json(res, 200, { ok: true });
};
