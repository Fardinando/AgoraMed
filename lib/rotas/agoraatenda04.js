'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [{"title":"Qual dado conecta o quadro à rabdomiólise?","domain":"Reconhecimento da rabdomiólise","correct":0,"feedback":"O contexto de compressão prolongada, dor/fraqueza, urina escura e CK muito elevada é compatível com rabdomiólise. A destruição muscular libera conteúdo intracelular, inclusive potássio, e a mioglobina pode contribuir para lesão renal. A CK é útil para acompanhar a tendência, mas nenhum valor isolado substitui avaliação clínica, eletrólitos, diurese e função renal.","reference":"AAST Critical Care Committee Consensus sobre rabdomiólise; UKKA 2026 para hipercalemia."},{"title":"Como priorizar a hipercalemia com alteração no ECG?","domain":"Hipercalemia com toxicidade elétrica","correct":2,"feedback":"K⁺ ≥6,5 mmol/L é grave. Com alteração compatível no ECG, mantenha monitorização contínua e administre cálcio IV conforme protocolo para reduzir temporariamente o risco elétrico. Em paralelo, faça redistribuição do potássio conforme o protocolo hospitalar e planeje sua remoção; cálcio não corrige a concentração sérica.","reference":"UKKA 2026, seção hospitalar: cálcio IV diante de alterações no ECG, redistribuição, remoção e monitorização."},{"title":"Como conduzir fluidos sem causar sobrecarga?","domain":"Hidratação individualizada","correct":1,"feedback":"A reposição de volume é frequentemente usada na rabdomiólise, mas deve ser guiada pela condição hemodinâmica e resposta. A AAST considera solução salina ou Ringer lactato aceitáveis, com terapia direcionada por metas e risco de sobrecarga; isso não justifica uma taxa fixa para todos. Reavalie perfusão, diurese, balanço, sinais pulmonares e função renal, especialmente se a urina não aumentar.","reference":"AAST Critical Care Committee Consensus, manejo de cristaloides e resposta urinária na rabdomiólise."},{"title":"Quais alterações precisam ser acompanhadas?","domain":"Monitorização metabólica e renal","correct":3,"feedback":"Acompanhe potássio seriado, creatinina e diurese, além da tendência da CK e de cálcio/fósforo. A hipocalcemia pode ocorrer na fase inicial da rabdomiólise; correção indiscriminada pode ser inadequada e favorecer deposição de cálcio-fosfato. Trate hipocalcemia quando houver indicação clínica, como sintomas relevantes ou necessidade de estabilização cardíaca diante de hipercalemia, e reavalie a evolução.","reference":"AAST Critical Care Committee Consensus: eletrólitos, função renal, CK e complicações da rabdomiólise."},{"title":"Bicarbonato, manitol ou diálise são profilaxias obrigatórias?","domain":"Limites de intervenções na rabdomiólise","correct":0,"feedback":"A AAST não recomenda bicarbonato ou diuréticos de rotina para prevenir lesão renal na rabdomiólise, e não há suporte para iniciar terapia renal substitutiva apenas por CK ou mioglobina elevadas. Corrija hipercalemia grave, avalie acidemia e sobrecarga e discuta terapia renal se surgirem indicações clínicas. A tendência laboratorial orienta vigilância, não uma decisão automática.","reference":"AAST Critical Care Committee Consensus: bicarbonato/diuréticos e terapia renal substitutiva na rabdomiólise."},{"title":"Como decidir se a evolução está controlada?","domain":"Reavaliação e escalonamento","correct":2,"feedback":"Mantenha acompanhamento frequente do potássio e ECG, glicemia após insulina-glicose, diurese, creatinina, CK e eletrólitos associados. Hipercalemia pode voltar enquanto há liberação muscular ou excreção renal inadequada. Escalone para nefrologia/terapia intensiva conforme resposta e complicações; a creatinina crescente exige avaliação, mas não é por si só um gatilho automático para diálise.","reference":"AAST Consensus e UKKA 2026: monitorização seriada de complicações e hipercalemia."}];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda04' || state.finished !== true || state.step !== STEPS.length) return null;
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
      key: `agoraatenda04-step-${index + 1}`,
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
      caseId: 'agoraatenda04',
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
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda04').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 4.' });
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
