'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [
  { title: 'Gravidade e prioridade', domain: 'Gravidade e prioridade', correct: 3, feedback: 'K⁺ ≥ 6,5 mmol/L é hipercalemia grave. A UKKA recomenda monitorização ECG contínua e avaliação sênior. ECG inicial sem alterações típicas não exclui risco; oligúria e lesão renal aguda limitam a excreção e aumentam o risco de progressão.' },
  { title: 'Tratamento inicial e segurança', domain: 'Tratamento inicial e segurança', correct: 2, feedback: 'O tratamento inicial hospitalar combina medidas de redistribuição conforme protocolo com um plano simultâneo de remoção. Salbutamol é adjuvante, não monoterapia; glicemia deve ser monitorada após insulina-glicose. Bicarbonato intravenoso não é recomendado rotineiramente para hipercalemia aguda, e cálcio protege o coração quando há toxicidade eletrocardiográfica, sem remover potássio.' },
  { title: 'Redistribuição versus remoção', domain: 'Redistribuição versus remoção', correct: 1, feedback: 'Insulina e salbutamol deslocam potássio para dentro das células, mas não o retiram do organismo. A queda inicial pode ser temporária e seguida de rebote quando a excreção renal permanece reduzida. Mantenha controles seriados e planeje a remoção.' },
  { title: 'Hipercalemia persistente e escalonamento', domain: 'Hipercalemia persistente e escalonamento', correct: 0, feedback: 'Rebote do potássio com lesão renal aguda oligúrica exige avaliação especializada urgente. A UKKA orienta considerar transferência quando a hipercalemia não é controlada por medidas médicas, especialmente em insuficiência renal avançada ou oligúrica. Nefrologia ou terapia intensiva deve decidir necessidade, tempo e modalidade da terapia renal substitutiva.' },
  { title: 'Transferência e continuidade do cuidado', domain: 'Transferência e continuidade do cuidado', correct: 3, feedback: 'Quando não há recurso renal no local, a escalada precisa ser coordenada por equipe sênior e comunicada ao serviço de referência. Compartilhe exames, ECG, diurese, tratamentos, horários e resposta, e mantenha monitorização e medidas indicadas durante a organização do transporte.' },
  { title: 'Monitorização e prevenção de rebote', domain: 'Monitorização e prevenção de rebote', correct: 1, feedback: 'Registre reavaliações seriadas do potássio, glicemia após insulina-glicose, ECG, diurese e função renal. A UKKA sugere controles de K⁺ em 1, 2, 4, 6 e 24 horas nos casos moderados ou graves; o intervalo real depende do quadro e do protocolo local. Um resultado inicial melhor não encerra a vigilância.' },
];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda03' || state.finished !== true || state.step !== STEPS.length) return null;
  if (!Array.isArray(state.answers) || state.answers.length !== STEPS.length || JSON.stringify(state).length > 40000) return null;
  const answers = [];
  const errors = [];
  let score = 0;
  for (let index = 0; index < STEPS.length; index += 1) {
    const step = STEPS[index];
    const answer = state.answers[index];
    if (!answer || !Number.isInteger(answer.choice) || answer.choice < 0 || answer.choice > 3) return null;
    const correct = answer.choice === step.correct;
    const selected = `Alternativa ${String.fromCharCode(65 + answer.choice)}`;
    const expected = `Alternativa ${String.fromCharCode(65 + step.correct)}`;
    if (correct) score += 1;
    answers.push({ step: index + 1, domain: step.domain, choice: answer.choice, correct });
    if (!correct) errors.push({
      key: `agoraatenda03-step-${index + 1}`,
      stepId: `step-${index + 1}`,
      title: step.title,
      selected,
      expected,
      feedback: step.feedback,
      reference: 'UK Kidney Association 2026',
      kind: 'decision',
    });
  }
  return {
    state: {
      caseId: 'agoraatenda03',
      finished: true,
      finishedAt: typeof state.finishedAt === 'string' ? state.finishedAt.slice(0, 40) : new Date().toISOString(),
      answers,
    },
    result: { score: Math.round((score / STEPS.length) * 100), correctAnswers: score, totalAnswers: STEPS.length, errors, passed: errors.length === 0 },
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  if (envFaltando().length) return json(res, 503, { ok: false, erro: 'Serviço indisponível.' });
  try {
    const perfil = await sessaoPerfil(req);
    if (!perfil) return json(res, 401, { ok: false, erro: 'Sua sessão expirou. Entre novamente.' });
    if (!await podeAcessarCurso(perfil, CURSO_HIPERCALEMIA)) return json(res, 403, { ok: false, erro: 'Você não tem acesso a este curso.' });

    if (req.method === 'GET') {
      if (req.query?.meta === '1') return json(res, 200, { ok: true, usuarioId: perfil.id });
      const r = await postgrest(`/agoraprescreva_tentativas?usuario_id=eq.${encodeURIComponent(perfil.id)}&curso_id=eq.${CURSO_HIPERCALEMIA}&select=id,estado,resultado,finalizada_em&order=finalizada_em.desc&limit=100`, { servico: true });
      if (!r.ok || !Array.isArray(r.dados)) throw new Error('Falha ao consultar tentativas.');
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda03').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 3.' });
    const saved = await postgrest('/agoraprescreva_tentativas?on_conflict=usuario_id,operation_id', {
      metodo: 'POST', servico: true, upsert: true,
      corpo: { usuario_id: perfil.id, curso_id: CURSO_HIPERCALEMIA, operation_id: body.operationId, estado: attempt.state, resultado: attempt.result, finalizada_em: new Date().toISOString() },
    });
    if (!saved.ok || !Array.isArray(saved.dados) || !saved.dados[0]) return json(res, 503, { ok: false, erro: 'Não foi possível sincronizar sua tentativa. Tente novamente.' });
    return json(res, 200, { ok: true, attemptId: saved.dados[0].id, errorsSynced: attempt.result.errors.length });
  } catch (_) {
    return json(res, 503, { ok: false, erro: 'Não foi possível sincronizar sua tentativa com a conta. Tente novamente.' });
  }
};

module.exports.avaliar = avaliar;
