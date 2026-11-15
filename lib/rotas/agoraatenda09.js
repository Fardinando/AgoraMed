'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [{"title":"O K⁺ sérico alto significa que há excesso corporal de potássio?","domain":"Estoque corporal versus valor sérico","correct":2,"feedback":"Na CAD, perda urinária por diurese osmótica frequentemente reduz o potássio corporal total. A falta de insulina e a acidemia deslocam K⁺ para o extracelular, podendo elevar a concentração sérica na apresentação. Com fluidos e insulina, o nível sérico pode cair acentuadamente; por isso, o valor inicial não deve ser interpretado como estoque corporal suficiente.","reference":"Consensus Report Hyperglycemic Crises 2024"},{"title":"Qual é a sequência inicial para tratar a CAD?","domain":"Tratamento integrado e sem duplicar insulina","correct":3,"feedback":"O foco é tratar a CAD com protocolo próprio: fluidos adequados ao estado clínico e insulina IV com monitorização. A insulina do protocolo também reduz K⁺ sérico; não se deve acrescentar automaticamente um esquema de insulina-glicose de hipercalemia, pois isso pode provocar queda excessiva do K⁺ e hipoglicemia. Ajuste em equipe e verifique eletrólitos com frequência.","reference":"Consensus Report Hyperglycemic Crises 2024; UKKA 2026"},{"title":"Quando deve entrar reposição de potássio?","domain":"Limite para iniciar ou pausar insulina","correct":0,"feedback":"O consenso de crise hiperglicêmica recomenda repor potássio e adiar temporariamente a insulina quando K⁺ está abaixo de 3,5 mmol/L, até que ultrapasse esse nível. Isso reduz risco de arritmia e fraqueza respiratória por hipocalemia. Dose e via dependem de gravidade, acesso, função renal, diurese e protocolo; a reposição requer monitorização estreita.","reference":"Consensus Report Hyperglycemic Crises 2024"},{"title":"Como monitorar a queda do potássio durante insulina?","domain":"Monitorização seriada e segurança","correct":1,"feedback":"O consenso recomenda medir K⁺ duas horas após iniciar insulina e, durante o tratamento, repetir em intervalos seriados (frequentemente a cada quatro horas), com ajuste ao estado clínico e protocolo. Monitore também glicemia, pH/bicarbonato, função renal, diurese e ECG quando indicado. A tendência importa mais do que um valor isolado.","reference":"Consensus Report Hyperglycemic Crises 2024"},{"title":"O K⁺ voltou a 3,7 mEq/L. Como retomar o plano?","domain":"Retomada da insulina e correção da CAD","correct":2,"feedback":"Com K⁺ acima do limite estabelecido, a insulina pode ser retomada para tratar a cetoacidose, com reposição de K⁺ ajustada à tendência e protocolos. A normalização da glicemia isolada não define resolução da CAD; acompanhe cetonas, pH/bicarbonato e condição clínica. Evite doses duplicadas destinadas ao tratamento isolado da hipercalemia.","reference":"Consensus Report Hyperglycemic Crises 2024"},{"title":"Quando a cetoacidose pode ser considerada resolvida?","domain":"Resolução metabólica e continuidade da insulina","correct":3,"feedback":"A melhora da glicemia isolada não significa que a cetose e a acidose resolveram. Continue a estratégia do protocolo até critérios de resolução clínico-bioquímica; glicose intravenosa pode ser necessária para continuar insulina enquanto se elimina cetona. A decisão considera K⁺, tolerância, acesso, gravidade e monitorização.","reference":"Consensus Report Hyperglycemic Crises 2024"},{"title":"Como fazer uma transição segura para insulina subcutânea?","domain":"Transição e prevenção de nova CAD","correct":1,"feedback":"Ao transitar, evite lacuna de insulina: esquema subcutâneo deve ser definido para a necessidade individual e a insulina basal administrada com a sobreposição recomendada pelo protocolo antes de cessar a infusão IV. Investigue a barreira que levou à omissão, garanta acesso a insulina e insumos e combine educação/seguimento.","reference":"Consensus Report Hyperglycemic Crises 2024"},{"title":"Qual conclusão sobre a hipercalemia inicial é correta?","domain":"Síntese e plano seguro","correct":0,"feedback":"A mensagem central é que concentração sérica e estoque corporal não são equivalentes. A deficiência de insulina e a acidemia podem elevar o K⁺ sérico, enquanto perdas urinárias causam depleção. A insulina do protocolo da CAD desloca K⁺ para dentro das células; por isso, monitore e reponha conforme tendência, sem duplicar esquemas.","reference":"Consensus Report Hyperglycemic Crises 2024; UKKA 2026"}];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda09' || state.finished !== true || state.step !== STEPS.length) return null;
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
      key: `agoraatenda09-step-${index + 1}`,
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
      caseId: 'agoraatenda09',
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
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda09').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 9.' });
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
