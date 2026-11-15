'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');
const Engine = require('../../js/agoraatenda01-engine');
const Flow = require('../../js/agoraatenda01-flow');
const Pedagogy = require('../../js/agoraatenda01-pedagogy');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRUGS = new Set(['calcium-gluconate', 'calcium-chloride', 'insulin', 'salbutamol', 'potassium-removal']);
const ORDER_STATES = new Set(['draft', 'prescribed', 'preparing', 'administered', 'cancelled', 'suspended', 'not-administered', 'refused-safety']);
const EVENT_TYPES = new Set(['action', 'prescription', 'medication-state', 'timepoint', 'reassessment']);

const OMITTED = [
  { pattern: /proteção cardíaca/i, key: 'calcium', stepId: 'calcium-order', title: 'Proteção cardíaca' },
  { pattern: /redistribuição temporária/i, key: 'shift', stepId: 'shift', title: 'Redistribuição temporária' },
  { pattern: /remoção definitiva/i, key: 'removal', stepId: 'removal', title: 'Remoção definitiva do potássio' },
  { pattern: /controles seriados de glicemia/i, key: 'glucose-monitoring', stepId: 'monitoring', title: 'Vigilância da glicemia' },
];

function texto(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function numero(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function limparOrdem(order) {
  if (!order || !DRUGS.has(order.drug)) return null;
  const details = order.details && typeof order.details === 'object' ? order.details : {};
  return {
    id: texto(order.id, 80),
    drug: order.drug,
    status: ORDER_STATES.has(order.status) ? order.status : 'draft',
    createdAtMinute: numero(order.createdAtMinute, 0),
    administeredAtMinute: numero(order.administeredAtMinute),
    reason: texto(order.reason, 400),
    details: {
      route: texto(details.route, 80),
      volumeMl: numero(details.volumeMl),
      durationMinutes: numero(details.durationMinutes),
      dose: numero(details.dose),
      dextroseGrams: numero(details.dextroseGrams),
      glucosePlan: details.glucosePlan === true,
      glucoseInfusion: details.glucoseInfusion === true,
      rate: texto(details.rate, 100),
      details: texto(details.details, 500),
    },
  };
}

function limparEvento(event) {
  if (!event || !EVENT_TYPES.has(event.type)) return null;
  const out = { type: event.type, atMinute: numero(event.atMinute, 0) };
  if (event.id) out.id = texto(event.id, 80);
  if (event.drug && DRUGS.has(event.drug)) out.drug = event.drug;
  if (ORDER_STATES.has(event.status)) out.status = event.status;
  if (event.note) out.note = texto(event.note, 500);
  if (event.type === 'reassessment') {
    const values = event.values && typeof event.values === 'object' ? event.values : {};
    out.values = {
      ecg: texto(values.ecg, 300),
      potassium: numero(values.potassium),
      glucose: numero(values.glucose),
      urineOutput: texto(values.urineOutput, 100),
    };
  }
  return out;
}

function avaliarTentativa(input) {
  if (!input || typeof input !== 'object' || JSON.stringify(input).length > 50000) return null;
  const rawActions = Array.isArray(input.actions) ? input.actions : [];
  const allowedActions = new Map(Engine.ACTIONS.map(action => [action.id, action]));
  const actions = rawActions.slice(0, 40).flatMap(action => {
    const spec = allowedActions.get(action && action.id);
    if (!spec) return [];
    return [{ id: spec.id, label: spec.label, detail: texto(action.detail, 500), atMinute: numero(action.atMinute, 0) }];
  });
  const actionIds = new Set(actions.map(action => action.id));
  const orders = (Array.isArray(input.orders) ? input.orders : []).slice(0, 20).map(limparOrdem).filter(Boolean);
  const events = (Array.isArray(input.events) ? input.events : []).slice(-80).map(limparEvento).filter(Boolean);
  const guided = input.guided && typeof input.guided === 'object' ? input.guided : {};
  const rawAnswers = guided.answers && typeof guided.answers === 'object' ? guided.answers : {};
  const answers = {};
  const errors = [];

  for (const step of Flow.STEPS) {
    if (step.kind !== 'decision' && step.kind !== 'salbutamol-choice') continue;
    const raw = rawAnswers[step.id];
    if (!raw || typeof raw.choiceId !== 'string') continue;
    const answer = Flow.evaluateChoice(step.id, raw.choiceId);
    if (!answer) return null;
    answers[step.id] = {
      choiceId: answer.id,
      label: answer.label,
      correct: answer.correct === true,
      feedback: answer.feedback,
      expected: answer.expected || null,
      reference: answer.reference || step.reference || null,
    };
    if (!answer.correct) errors.push({
      key: `decision-${step.id}`,
      stepId: step.id,
      title: step.title,
      selected: answer.label,
      expected: answer.expected || '',
      feedback: answer.feedback,
      reference: answer.reference || step.reference || '',
      kind: 'decision',
    });
  }

  const orderAdministered = drug => orders.some(order => order.drug === drug && order.status === 'administered');
  const flags = {
    abcde: actionIds.has('abcde'),
    monitor: actionIds.has('monitor'),
    ecg: actionIds.has('ecg'),
    access: actionIds.has('access'),
    labs: actionIds.has('labs'),
    history: actionIds.has('history'),
    calciumGiven: orderAdministered('calcium-gluconate') || orderAdministered('calcium-chloride'),
    insulinGiven: orderAdministered('insulin'),
    glucosePlan: orders.some(order => order.drug === 'insulin' && (order.details.glucosePlan || order.details.glucoseInfusion)),
    salbutamolGiven: orderAdministered('salbutamol'),
    definitiveRemoval: orderAdministered('potassium-removal'),
    removalPlanned: actionIds.has('removal') || orders.some(order => order.drug === 'potassium-removal'),
    nephrology: actionIds.has('nephrology') && !!texto(guided.nephrologyRequest, 4000),
    reassessment: events.some(event => event.type === 'reassessment') || actionIds.has('reassessment'),
    'glucose-series': actionIds.has('glucose-series'),
    complications: actionIds.has('complications'),
    disposition: actionIds.has('disposition'),
    etiology: actionIds.has('history'),
  };
  const result = Pedagogy.evaluate({ flags });
  for (const item of result.critical) {
    const match = OMITTED.find(entry => entry.pattern.test(item));
    if (!match) continue;
    errors.push({
      key: `omission-${match.key}`,
      stepId: match.stepId,
      title: match.title,
      selected: 'Não registrado nesta tentativa',
      expected: item,
      feedback: 'Este ponto de segurança não aparece como realizado no registro final. Reveja a sequência e os critérios apresentados na simulação.',
      reference: '',
      kind: 'omission',
    });
  }

  const state = {
    caseId: 'agoraatenda01',
    phase: texto(input.phase, 40),
    actions,
    orders,
    events,
    flags,
    guided: {
      answers,
      nephrologyCalled: flags.nephrology,
      nephrologyRequest: texto(guided.nephrologyRequest, 4000),
    },
  };
  return {
    state,
    result: {
      score: result.score,
      domains: result.domains,
      critical: result.critical,
      errors,
      passed: result.passed,
      summary: result.summary,
    },
  };
}

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
      if (req.query?.meta === '1') return json(res, 200, { ok: true, usuarioId: perfil.id });
      const r = await postgrest(`/agoraprescreva_tentativas?usuario_id=eq.${encodeURIComponent(perfil.id)}&curso_id=eq.${CURSO_HIPERCALEMIA}&select=id,estado,resultado,finalizada_em&order=finalizada_em.desc&limit=100`, { servico: true });
      if (!r.ok || !Array.isArray(r.dados)) throw new Error('Falha ao consultar tentativas.');
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda01').slice(0, 25).map(row => ({
        id: row.id,
        finishedAt: row.finalizada_em,
        state: row.estado,
        result: row.resultado,
      }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    const operationId = String(body.operationId || '');
    if (!UUID.test(operationId)) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliarTentativa(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'Os dados da tentativa estão incompletos ou excedem o limite permitido.' });

    const saved = await postgrest('/agoraprescreva_tentativas?on_conflict=usuario_id,operation_id', {
      metodo: 'POST', servico: true, upsert: true,
      corpo: {
        usuario_id: perfil.id,
        curso_id: CURSO_HIPERCALEMIA,
        operation_id: operationId,
        estado: attempt.state,
        resultado: attempt.result,
        finalizada_em: new Date().toISOString(),
      },
    });
    if (!saved.ok || !Array.isArray(saved.dados) || !saved.dados[0])
      return json(res, 503, { ok: false, erro: 'Não foi possível sincronizar sua tentativa. Ela continua salva neste dispositivo; tente novamente.' });
    return json(res, 200, { ok: true, attemptId: saved.dados[0].id, errorsSynced: attempt.result.errors.length });
  } catch (_) {
    return json(res, 503, { ok: false, erro: 'Não foi possível sincronizar sua tentativa com a conta. Tente novamente.' });
  }
};

module.exports.avaliarTentativa = avaliarTentativa;
