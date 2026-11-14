'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');
const { gradePrescription } = require('../../js/agoraprescreva-rules');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  if (envFaltando().length) return json(res, 503, { ok: false, erro: 'Serviço indisponível.' });

  try {
    const perfil = await sessaoPerfil(req);
    if (!perfil) return json(res, 401, { ok: false, erro: 'Sua sessão expirou. Entre novamente.' });
    if (!await podeAcessarCurso(perfil, CURSO_HIPERCALEMIA))
      return json(res, 403, { ok: false, erro: 'Você não tem acesso a este curso.' });

    const body = req.body || {};
    const operationId = String(body.operationId || '');
    const state = body.state;
    if (!UUID.test(operationId) || !state || !Array.isArray(state.orders) || !Array.isArray(state.actions))
      return json(res, 400, { ok: false, erro: 'Não foi possível reconhecer os dados da tentativa.' });
    if (JSON.stringify(state).length > 50000 || state.orders.length > 40 || state.actions.length > 30)
      return json(res, 413, { ok: false, erro: 'A tentativa excede o limite permitido.' });

    const safeState = {
      orders: state.orders.map(order => ({
        id: String(order.id || '').slice(0, 80),
        name: String(order.name || '').slice(0, 120),
        presentation: String(order.presentation || '').slice(0, 160),
        dose: String(order.dose || '').slice(0, 80),
        unit: String(order.unit || '').slice(0, 40),
        route: String(order.route || '').slice(0, 60),
        diluent: String(order.diluent || '').slice(0, 240),
        volume: String(order.volume || '').slice(0, 80),
        rate: String(order.rate || '').slice(0, 120),
        frequency: String(order.frequency || '').slice(0, 120),
        instructions: String(order.instructions || '').slice(0, 500),
      })),
      actions: state.actions.map(value => String(value).slice(0, 80)),
      notes: String(state.notes || '').slice(0, 2000),
      reassessment: state.reassessment && typeof state.reassessment === 'object' ? state.reassessment : {},
    };
    const grade = gradePrescription({
      meds: safeState.orders.map(order => ({ ...order, preparation: order.diluent })),
      actions: safeState.actions,
    });
    const result = {
      total: grade.total,
      domains: grade.domains,
      positive: grade.positive,
      critical: grade.critical,
      pending: grade.pending,
      meetsPreviewThreshold: grade.meetsPreviewThreshold,
    };
    const saved = await postgrest('/agoraprescreva_tentativas?on_conflict=usuario_id,operation_id', {
      metodo: 'POST', servico: true, upsert: true,
      corpo: { usuario_id: perfil.id, curso_id: CURSO_HIPERCALEMIA, operation_id: operationId, estado: safeState, resultado: result, finalizada_em: new Date().toISOString() },
    });
    if (!saved.ok || !Array.isArray(saved.dados) || !saved.dados[0])
      return json(res, 503, { ok: false, erro: 'Não foi possível registrar sua tentativa. Seus dados continuam salvos neste dispositivo; tente novamente.' });

    return json(res, 200, { ok: true, attemptId: saved.dados[0].id });
  } catch (_) {
    return json(res, 503, { ok: false, erro: 'Não foi possível registrar sua tentativa. Tente novamente.' });
  }
};
