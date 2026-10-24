'use strict';
const { json, exigirAdmin } = require('../../api');
const { configurado, DESTINATARIO, enviarTeste, processarPendentes } = require('../../notificacoes');
module.exports = async (req, res) => {
  if (!await exigirAdmin(req, res)) return;
  if (req.method === 'GET') return json(res, 200, { ok: true, configurado: configurado(), destinatario: DESTINATARIO });
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  try {
    const acao = (req.body || {}).acao;
    if (acao === 'testar') return json(res, 200, await enviarTeste());
    if (acao === 'processar') return json(res, 200, await processarPendentes());
    return json(res, 400, { ok: false, erro: 'Ação inválida.' });
  } catch (e) {
    return json(res, 503, { ok: false, erro: 'Não foi possível processar os avisos agora.' });
  }
};
