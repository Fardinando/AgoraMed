/* Atualiza somente as divulgações enviadas. Exclusões exigem IDs explícitos.
   Capas existentes nunca são apagadas durante o salvamento de outra divulgação. */
'use strict';
const { randomUUID } = require('crypto');
const { json, envFaltando, exigirAdmin, postgrest, storage, dataUrlParaBytes, promoParaEd, env } = require('../../api');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });
  if (!await exigirAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const lista = req.body?.lista, removidos = req.body?.removidos || [];
  if (!Array.isArray(lista) || !Array.isArray(removidos) || removidos.some(id => !uuid.test(id)))
    return json(res, 400, { ok: false, erro: 'Lista de divulgações inválida.' });
  const ids = new Set();
  for (const p of lista) {
    if (!p || typeof p !== 'object' || (p.id && !uuid.test(p.id)) || (p.id && (ids.has(p.id) || removidos.includes(p.id))))
      return json(res, 400, { ok: false, erro: 'Identificação de divulgação inválida.' });
    if (p.id) ids.add(p.id);
  }
  try {
    const consulta = await postgrest('/promos?select=*&order=ordem.asc,criado_em.asc', { servico: true });
    if (!consulta.ok || !Array.isArray(consulta.dados)) throw new Error('Não foi possível consultar as divulgações. Nada foi alterado.');
    const antigas = consulta.dados;
    let proximaOrdem = Math.max(0, ...antigas.map(p => Number(p.ordem) || 0));
    const corpos = [];
    for (const p of lista) {
      const id = p.id || randomUUID(), anterior = antigas.find(a => a.id === id);
      let imagemUrl = anterior?.imagem_url || '';
      const imagem = String(p.capaImagem || '');
      if (imagem.startsWith('data:')) {
        const b = dataUrlParaBytes(imagem);
        if (!b || !['image/jpeg','image/png','image/webp'].includes(b.mime) || !b.dados.length || b.dados.length > 5000000)
          throw new Error('Capa inválida. Use uma imagem JPG, PNG ou WebP de até 5 MB.');
        const ext = b.mime === 'image/png' ? 'png' : b.mime === 'image/webp' ? 'webp' : 'jpg';
        const caminho = `${id}.promo.${randomUUID()}.${ext}`;
        const envio = await storage('POST', `object/capas/${caminho}`, { corpo: b.dados, contentType: b.mime });
        if (!envio.ok) throw new Error('Não foi possível enviar a capa. As divulgações anteriores foram preservadas.');
        imagemUrl = `${env.SUPABASE_URL}/storage/v1/object/public/capas/${caminho}`;
      } else if (!anterior && imagem) {
        // Compatibilidade com imagens públicas já selecionadas pelo professor.
        const url = new URL(imagem);
        if (!['https:','http:'].includes(url.protocol)) throw new Error('Endereço de capa inválido.');
        imagemUrl = imagem;
      }
      corpos.push({ id, titulo: String(p.titulo || 'Divulgação').trim().slice(0,140), texto: String(p.texto || '').trim().slice(0,500),
        link: String(p.link || '').trim().slice(0,500), imagem_url: imagemUrl, ordem: anterior?.ordem ?? ++proximaOrdem,
        ativo: anterior?.ativo ?? true, emoji: String(p.emoji || '🎓').slice(0,8) });
    }
    if (corpos.length) {
      let r = await postgrest('/promos?on_conflict=id', { metodo:'POST', servico:true, upsert:true, corpo:corpos });
      if (!r.ok && r.status === 400 && /emoji/i.test(JSON.stringify(r.dados || '')))
        r = await postgrest('/promos?on_conflict=id', { metodo:'POST', servico:true, upsert:true, corpo:corpos.map(({emoji,...p}) => p) });
      if (!r.ok) throw new Error('Não foi possível salvar. As divulgações anteriores foram preservadas.');
    }
    if (removidos.length) {
      const r = await postgrest(`/promos?id=in.(${removidos.join(',')})`, { metodo:'DELETE', servico:true });
      if (!r.ok) throw new Error('Não foi possível excluir a divulgação.');
    }
    const atual = await postgrest('/promos?select=*&order=ordem.asc,criado_em.asc', { servico:true });
    if (!atual.ok || !Array.isArray(atual.dados)) throw new Error('Não foi possível confirmar a lista atualizada. Recarregue o painel antes de tentar novamente.');
    return json(res, 200, { ok:true, promos:atual.dados.map(promoParaEd) });
  } catch (e) { return json(res, 200, { ok:false, erro:e.message || 'Não foi possível salvar a divulgação.' }); }
};
