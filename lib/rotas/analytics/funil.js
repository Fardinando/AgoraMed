'use strict';
const { json, envFaltando, postgrest } = require('../../api');
const { ORIGEM } = require('../../mercado-pago-producao');

const EVENTOS = new Set(['landing_view', 'sample_open', 'sample_answer', 'buy_click', 'checkout_view', 'checkout_start', 'payment_return']);
const PAGINAS = new Set(['hipercalemia', 'matricula', 'pagamento']);
const AREAS = new Set(['pagina', 'hero', 'nav', 'oferta', 'final', 'sticky', 'demonstracao', 'checkout', 'pagamento']);
const UTMS = new Set(['utm_source', 'utm_medium', 'utm_campaign']);
const LIMPO = /^[a-z0-9][a-z0-9._-]{0,79}$/;

function dimensao(valor, fallback) {
  const texto = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
  return texto && LIMPO.test(texto) && !texto.includes('..') ? texto : fallback;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return json(res, 405, { ok: false });
  if (req.headers.origin !== ORIGEM || req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { ok: false });
  if (envFaltando().length) return json(res, 503, { ok: false });

  const body = req.body || {};
  if (!EVENTOS.has(body.evento) || !PAGINAS.has(body.pagina) || !AREAS.has(body.area) || !['mobile', 'desktop'].includes(body.dispositivo))
    return json(res, 400, { ok: false });

  const campos = {
    p_evento: body.evento,
    p_pagina: body.pagina,
    p_area: body.area,
    p_dispositivo: body.dispositivo,
    p_origem: dimensao(body.utm_source, 'direct'),
    p_midia: dimensao(body.utm_medium, 'none'),
    p_campanha: dimensao(body.utm_campaign, 'none'),
  };

  try {
    const salvo = await postgrest('/rpc/agoramed_registrar_funil', { metodo: 'POST', servico: true, corpo: campos });
    if (!salvo.ok) throw new Error('Falha no registro agregado do funil.');
    res.statusCode = 204;
    return res.end();
  } catch {
    return json(res, 503, { ok: false });
  }
};
