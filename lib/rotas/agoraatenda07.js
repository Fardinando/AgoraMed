'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [{"title":"Qual é a prioridade diante da bradicardia e do ECG?","domain":"Emergência elétrica e estabilização","correct":0,"feedback":"Bradicardia, hipotensão e QRS alargado em K⁺ 7,3 configuram emergência. O cálcio IV antagoniza temporariamente os efeitos elétricos do potássio; não o reduz. Monitorização, suporte inicial e medidas para deslocar/remover K⁺ devem ocorrer em paralelo. Reavalie o ECG e considere repetir cálcio se alterações persistirem ou recorrerem, conforme protocolo.","reference":"UKKA 2026"},{"title":"Que parte da história medicamentosa é decisiva agora?","domain":"Reconciliação medicamentosa e abordagem acolhedora","correct":2,"feedback":"A espironolactona antagoniza o receptor mineralocorticoide e poupa potássio, podendo contribuir para hipercalemia; o risco aumenta com disfunção renal e outros fatores. Suspenda/segure durante a emergência e faça reconciliação detalhada. A paciente merece cuidado confidencial e sem estigma: esclarecer o que utiliza, sem afirmar que a espironolactona neutraliza de modo confiável os efeitos da testosterona.","reference":"UKKA 2026"},{"title":"Como interpretar a mialgia e a CK elevada?","domain":"Lesão muscular, rabdomiólise e função renal","correct":1,"feedback":"Mialgia e CK elevada exigem avaliar rabdomiólise, tendência da CK, creatinina, diurese, eletrólitos e possíveis complicações. Hidratação pode ser considerada em contexto apropriado, mas deve ser individualizada e reavaliada — não é uma ordem automática, sobretudo quando há risco de sobrecarga. A hipercalemia grave e a toxicidade elétrica continuam sendo prioridades.","reference":"Consenso AAST 2022; UKKA 2026"},{"title":"Como reduzir rapidamente o potássio sérico?","domain":"Redistribuição e remoção de potássio","correct":3,"feedback":"Insulina com glicose promove deslocamento intracelular temporário do K⁺; beta-2 agonista pode ser adjuvante. Essas medidas não removem o potássio do corpo, por isso é necessário avaliar sua eliminação e a causa. O cálcio deve ser guiado pelo ECG, não por uma meta de potássio. Bicarbonato não é tratamento rotineiro isolado sem contexto de acidose relevante.","reference":"UKKA 2026"},{"title":"O que deve ser monitorado após as medidas iniciais?","domain":"Resposta, rebote e segurança","correct":0,"feedback":"A melhora eletrocardiográfica é um sinal favorável, não prova que o potássio foi eliminado. Mantenha telemetria na fase de risco, programe controles de K⁺ e glicemia após insulina, acompanhe função renal, diurese e evolução clínica. A necessidade de repetir cálcio é guiada pelo ECG e protocolo; não administre terapias às cegas.","reference":"UKKA 2026"},{"title":"Como abordar a testosterona e a mudança na voz?","domain":"Comunicação, autonomia e seguimento","correct":2,"feedback":"A prioridade imediata foi tratar a emergência. Depois, explique com honestidade que a resposta hormonal varia e que não se deve prometer que a espironolactona impeça ou reverta mudanças vocais. Pergunte quais são os objetivos da paciente e ofereça avaliação profissional confidencial, incluindo riscos cardiovasculares, renais e de produtos não prescritos.","reference":"UKKA 2026"},{"title":"Qual plano reduz o risco de recorrência?","domain":"Prevenção, seguimento e redução de danos","correct":1,"feedback":"A prevenção inclui confirmar resolução do potássio, acompanhar creatinina e diurese, rever todas as exposições e assegurar acesso a cuidado longitudinal confidencial. Explique sinais de alerta e não reinicie ou aumente espironolactona sem indicação, avaliação laboratorial e supervisão. O treino e a testosterona não devem ser usados como explicação única sem investigação.","reference":"UKKA 2026"},{"title":"Como fechar o plano de cuidado com autonomia e segurança?","domain":"Cuidado centrado na paciente e redução de danos","correct":3,"feedback":"Use perguntas abertas e linguagem neutra para entender indicação percebida, produtos, dose e objetivos. Explique o que se sabe e o que não pode ser garantido sobre efeitos hormonais; ofereça seguimento confidencial e monitorização. Evite prometer reversão da voz ou impor mudanças sem avaliação e discussão compartilhada.","reference":"UKKA 2026"}];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda07' || state.finished !== true || state.step !== STEPS.length) return null;
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
      key: `agoraatenda07-step-${index + 1}`,
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
      caseId: 'agoraatenda07',
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
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda07').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 7.' });
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
