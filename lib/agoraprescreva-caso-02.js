'use strict';

const FORMULARIOS = {
  initial: { diuresis: ['on'], review: ['on'], potassium: ['early', 'late'] },
  'poor-form': { decision: ['review', 'repeat'] },
  'follow-up': { loop: ['review', 'fixed'], labs: ['on'], fluid: ['on'] },
};
const CAMPOS_ORDEM = ['id', 'name', 'dose', 'unit', 'route', 'timing', 'notes'];
const registro = value => value && typeof value === 'object' && !Array.isArray(value);

function prepararCaso02(state) {
  if (!registro(state) || !registro(state.reviewedSteps)) return null;
  if (!['good', 'poor'].includes(state.finalBranch)) return null;
  const finalStep = state.finalBranch === 'poor' ? 'poor-form' : 'follow-up';
  const etapas = {};
  for (const [id, fields] of Object.entries(FORMULARIOS)) {
    const step = state.reviewedSteps[id];
    if (step == null) continue;
    if (!registro(step) || !registro(step.answers) || !Array.isArray(step.orders)
      || step.orders.length > 40 || !step.orders.every(registro)
      || (id === 'poor-form' && step.orders.length !== 0)) return null;

    const answers = {};
    for (const [key, value] of Object.entries(step.answers)) {
      if (!Object.hasOwn(fields, key) || !fields[key].includes(value)) return null;
      answers[key] = value;
    }
    const required = { initial: 'potassium', 'poor-form': 'decision', 'follow-up': 'loop' }[id];
    if (!answers[required]) return null;
    etapas[id] = {
      answers,
      orders: step.orders.map(order => Object.fromEntries(CAMPOS_ORDEM.map(key => [
        key, typeof order[key] === 'string' ? order[key].slice(0, key === 'notes' ? 500 : 120) : '',
      ]))),
      reviewedAt: timestamp(step.reviewedAt),
      feedbackShown: Array.isArray(step.feedback)
        ? step.feedback.filter(message => typeof message === 'string').slice(0, 50).map(message => message.slice(0, 2000))
        : [],
    };
  }
  if (!etapas.initial || !etapas[finalStep]) return null;
  return {
    estado: { caseId: '02', startedAt: timestamp(state.startedAt), finalBranch: state.finalBranch, reviewedSteps: etapas },
    resultado: {
      caseId: '02',
      etapaFinal: finalStep,
      ...(etapas['poor-form'] && { reavaliacaoImediata: etapas['poor-form'].answers.decision === 'review' }),
    },
  };
}

function timestamp(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

module.exports = { prepararCaso02 };
