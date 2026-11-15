'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');
const { gradePrescription } = require('../../js/agoraprescreva-rules');
const { prepararCaso02 } = require('../agoraprescreva-caso-02');
const { prepararCaso03 } = require('../agoraprescreva-caso-03');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  if (envFaltando().length) return json(res, 503, { ok: false, erro: 'Serviço indisponível.' });

  try {
    const perfil = await sessaoPerfil(req);
    if (!perfil) return json(res, 401, { ok: false, erro: 'Sua sessão expirou. Entre novamente.' });
    if (!await podeAcessarCurso(perfil, CURSO_HIPERCALEMIA))
      return json(res, 403, { ok: false, erro: 'Você não tem acesso a este curso.' });

    if (req.method === 'GET') {
      const history = await postgrest(
        `/agoraprescreva_tentativas?usuario_id=eq.${encodeURIComponent(perfil.id)}&curso_id=eq.${CURSO_HIPERCALEMIA}&${encodeURIComponent('estado->>caseId')}=eq.02&select=id,estado,resultado,finalizada_em&order=finalizada_em.desc&limit=25`,
        { servico: true }
      );
      if (!history.ok || !Array.isArray(history.dados)) throw new Error('Falha ao consultar tentativas.');
      return json(res, 200, {
        ok: true,
        attempts: history.dados.map(row => ({
          id: row.id,
          finishedAt: row.finalizada_em,
          finalBranch: row.estado?.finalBranch === 'poor' ? 'poor' : 'good',
          initial: row.estado?.reviewedSteps?.initial || null,
          reassessment: row.estado?.reviewedSteps?.[row.estado?.finalBranch === 'poor' ? 'poor-form' : 'follow-up'] || null,
          score: Number.isFinite(row.resultado?.score) ? row.resultado.score : null,
        })),
      });
    }

    const body = req.body || {};
    const operationId = String(body.operationId || '');
    const state = body.state;
    if (body.caseId === '02') {
      if (!UUID.test(operationId) || !state)
        return json(res, 400, { ok: false, erro: 'Não foi possível reconhecer os dados da tentativa.' });
      if (JSON.stringify(state).length > 50000)
        return json(res, 413, { ok: false, erro: 'A tentativa excede o limite permitido.' });
      const dados = prepararCaso02(state);
      if (!dados)
        return json(res, 400, { ok: false, erro: 'Confira a prescrição e a reavaliação antes de finalizar.' });
      return await salvarTentativa(res, perfil.id, operationId, dados.estado, dados.resultado);
    }
    if (body.caseId === '03') {
      if (!UUID.test(operationId) || !state)
        return json(res, 400, { ok: false, erro: 'Não foi possível reconhecer os dados da tentativa.' });
      if (JSON.stringify(state).length > 50000)
        return json(res, 413, { ok: false, erro: 'A tentativa excede o limite permitido.' });
      const dados = prepararCaso03(state);
      if (!dados)
        return json(res, 400, { ok: false, erro: 'Confira os itens e as condutas antes de finalizar.' });
      return await salvarTentativa(res, perfil.id, operationId, dados.estado, dados.resultado, 'Seu rascunho continua salvo neste dispositivo; tente novamente.');
    }
    if (body.caseId != null && body.caseId !== '01')
      return json(res, 400, { ok: false, erro: 'Caso desconhecido.' });
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
    return await salvarTentativa(res, perfil.id, operationId, safeState, result, 'Seus dados continuam salvos neste dispositivo; tente novamente.');
  } catch (_) {
    return json(res, 503, { ok: false, erro: 'Não foi possível registrar sua tentativa. Tente novamente.' });
  }
};

async function salvarTentativa(res, usuarioId, operationId, estado, resultado, instrucoes = 'Tente novamente.') {
  const saved = await postgrest('/agoraprescreva_tentativas?on_conflict=usuario_id,operation_id', {
    metodo: 'POST', servico: true, upsert: true,
    corpo: { usuario_id: usuarioId, curso_id: CURSO_HIPERCALEMIA, operation_id: operationId, estado, resultado, finalizada_em: new Date().toISOString() },
  });
  if (!saved.ok || !Array.isArray(saved.dados) || !saved.dados[0])
    return json(res, 503, { ok: false, erro: 'Não foi possível registrar sua tentativa. ' + instrucoes });
  return json(res, 200, { ok: true, attemptId: saved.dados[0].id });
}
