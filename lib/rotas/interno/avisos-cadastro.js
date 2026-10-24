'use strict';
const crypto = require('crypto');
const { json } = require('../../api');
const { processarPendentes } = require('../../notificacoes');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false });
  if (!process.env.CRON_SECRET) return json(res, 503, { ok: false });
  const esperado = Buffer.from('Bearer ' + process.env.CRON_SECRET);
  const recebido = Buffer.from(String(req.headers.authorization || ''));
  if (recebido.length !== esperado.length || !crypto.timingSafeEqual(recebido, esperado)) return json(res, 403, { ok: false });
  try { return json(res, 200, await processarPendentes()); }
  catch (e) { return json(res, 503, { ok: false }); }
};
