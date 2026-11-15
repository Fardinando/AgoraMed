'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [{"title":"Qual é a prioridade na apresentação?","domain":"Prioridade e riscos simultâneos","correct":2,"feedback":"K⁺ 6,6 mmol/L é grave, e o QRS alargado é sinal potencial de toxicidade elétrica: monitorização contínua e tratamento imediato conforme protocolo são prioritários. Em paralelo, pH 7,10 exige avaliação da causa e da capacidade compensatória. A oligúria/lesão renal reduz a excreção de K⁺ e ácidos; não espere uma correção isolada do pH para tratar o risco cardíaco.","reference":"UKKA 2026, tratamento hospitalar da hipercalemia grave e alterações no ECG."},{"title":"Como explicar a relação entre acidemia e potássio?","domain":"Fisiologia da acidemia e do potássio","correct":0,"feedback":"A acidemia pode influenciar o transporte transcelular e contribuir para aumento de K⁺ extracelular, especialmente em alguns tipos de acidose. Mas a explicação “H⁺ entra e K⁺ sai” é um modelo didático, não uma regra quantitativa universal: tipo de ácido, insulina, catecolaminas, catabolismo e excreção renal modificam a resposta. Nesta paciente, lesão renal e oligúria também reduzem a eliminação de potássio.","reference":"BMJ 2026, revisão de fisiologia e tratamento da hipercalemia; gasometria e dados do cenário."},{"title":"Qual abordagem imediata reduz o risco elétrico e o potássio?","domain":"Tratamento imediato da hipercalemia","correct":3,"feedback":"Cálcio IV é uma medida de estabilização elétrica temporária quando há alterações no ECG; não reduz a concentração sérica. O protocolo hospitalar inclui tratamento de redistribuição, como insulina com glicose, e planejamento para eliminar K⁺. Acompanhe ECG e glicemia, pois a insulina pode causar hipoglicemia tardia. A correção da acidemia é discutida separadamente, em paralelo.","reference":"UKKA 2026, diretrizes hospitalares sobre cálcio, insulinoterapia e bicarbonato."},{"title":"O bicarbonato deve ser usado automaticamente?","domain":"Acidemia grave e bicarbonato","correct":1,"feedback":"Não use bicarbonato IV como reflexo automático para baixar potássio: UKKA não recomenda seu uso rotineiro no tratamento agudo da hipercalemia. A acidemia grave (pH 7,10) merece avaliação própria e individualizada, especialmente com AKI. Se considerado, pondere causa, ventilação/geração de CO₂, carga de sódio e volume, cálcio ionizado e reavaliações seriadas. O ensaio BICARICU-2 em pacientes críticos com acidemia grave e AKI não demonstrou redução da mortalidade em 90 dias; isso não transforma a terapia em regra universal.","reference":"UKKA 2026, diretriz 16.5; BICARICU-2, JAMA 2025 (acidemia grave e AKI)."},{"title":"O que precisa ser investigado para tratar a causa?","domain":"Investigação etiológica e cuidado renal","correct":2,"feedback":"Lactato e cetonas baixos tornam essas causas menos prováveis, mas complete avaliação ácido-base: ânion gap, cloro, função renal, perdas digestivas, medicamentos e perfusão. Tratar a causa e recuperar excreção renal são essenciais para controlar K⁺ e acidemia. Acione nefrologia/terapia intensiva conforme persistência, tendência e estado clínico. Qualquer suspensão de fármacos deve ser contextual e reavaliada após estabilização.","reference":"UKKA 2026 e revisão BMJ 2026: tratar causas reversíveis, reconhecer papel renal e contextualizar acidoses."},{"title":"Como reavaliar e quando escalar?","domain":"Reavaliação e escalonamento","correct":0,"feedback":"Persiste risco: K⁺ ainda elevado, acidemia significativa e pouca excreção. Mantenha monitorização seriada de potássio, gasometria, glicemia após insulina, ECG, diurese, creatinina e efeitos de eventual bicarbonato (sódio/volume/cálcio ionizado). Acione nefrologia/terapia intensiva para avaliar resposta e possível terapia renal substitutiva; nenhum valor isolado de pH determina diálise automaticamente.","reference":"UKKA 2026 para reavaliação e hipercalemia persistente; BICARICU-2 para limites da evidência de bicarbonato."}];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda05' || state.finished !== true || state.step !== STEPS.length) return null;
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
      key: `agoraatenda05-step-${index + 1}`,
      stepId: `step-${index + 1}`,
      title: step.title,
      selected,
      expected,
      feedback: step.feedback,
      reference: step.reference,
      kind: 'decision',
    });
  }
  return {
    state: {
      caseId: 'agoraatenda05',
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
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda05').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 5.' });
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
