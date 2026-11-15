'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [{"title":"Que sinais tornam este quadro uma emergência?","domain":"Reconhecimento e resposta inicial","correct":3,"feedback":"A instabilidade elétrica, bloqueio AV, arritmia ventricular, sintomas e hipercalemia no contexto de exposição sugerem toxicidade grave. Estabilize a paciente, mantenha monitorização, interrompa digoxina, recolha história de dose/tempo e chame toxicologia/centro de intoxicações. Um nível isolado deve ser interpretado conforme o horário da última dose e não deve atrasar ação em quadro ameaçador.","reference":"AHA 2025; bula FDA Digoxin Immune Fab 2025"},{"title":"Qual é a terapia específica prioritária?","domain":"Anticorpos Fab como antídoto","correct":0,"feedback":"Em intoxicação potencialmente fatal, fragmentos Fab específicos são a terapia que neutraliza digoxina e devem ser considerados prontamente, com toxicologia e protocolo institucional. A dose depende da informação disponível e da gravidade. Não espere o K⁺ normalizar nem use medidas de remoção renal como substituto do antídoto.","reference":"AHA 2025; bula FDA Digoxin Immune Fab 2025"},{"title":"O que fazer com o potássio elevado sem atrasar o Fab?","domain":"Tratamento paralelo e contexto da hipercalemia","correct":2,"feedback":"O antídoto específico é prioridade. Enquanto ele é organizado, equipe experiente deve avaliar e tratar a hipercalemia ameaçadora à vida conforme ECG e protocolo local, sem atrasar Fab. A discussão sobre cálcio em intoxicação digitálica tem nuances e evidência limitada; não transforme advertências tradicionais em uma proibição universal sem avaliação especializada.","reference":"AHA 2025; UKKA 2026; bula FDA Digoxin Immune Fab 2025"},{"title":"Por que o potássio deve ser reavaliado após Fab?","domain":"Reavaliação após antídoto","correct":1,"feedback":"Na intoxicação aguda, a hipercalemia se relaciona à inibição da Na⁺/K⁺-ATPase. Após Fab, o K⁺ pode cair de forma rápida; acompanhe concentrações seriadas, ECG e função renal, e trate alterações conforme valores e sintomas. Melhora inicial não substitui observação da resposta ou avaliação de recorrência.","reference":"Bula FDA Digoxin Immune Fab 2025; AHA 2025"},{"title":"Como interpretar a dosagem de digoxina depois do Fab?","domain":"Interferência laboratorial após Fab","correct":3,"feedback":"Após Fab, a digoxina total pode permanecer elevada por detecção de complexos Fab-digoxina e não representar a fração livre ativa. Evite guiar doses adicionais pelo número isolado; integre sinais, ECG, K⁺ e orientação toxicológica. Continue monitorando clinicamente, porque a insuficiência renal pode prolongar a observação e há risco de recorrência.","reference":"Bula FDA Digoxin Immune Fab 2025"},{"title":"A hemodiálise removerá a digoxina?","domain":"Limites da depuração extracorpórea","correct":0,"feedback":"Hemodiálise, hemofiltração e hemoperfusão não removem digoxina de modo clinicamente eficaz por sua distribuição tecidual. Fab neutraliza o fármaco circulante e tecidual disponível. Insuficiência renal pode exigir cuidado renal por indicações próprias, mas não se deve atrasar o antídoto esperando depuração extracorpórea.","reference":"AHA 2025; bula FDA Digoxin Immune Fab 2025"},{"title":"Que risco deve ser observado se a função renal continuar ruim?","domain":"Observação prolongada e função renal","correct":2,"feedback":"A resposta inicial ao Fab é importante, mas não encerra vigilância, especialmente com função renal comprometida. Acompanhe ECG, K⁺, sinais/sintomas e possibilidade de recorrência, e discuta duração de observação com toxicologia. Diálise não é método eficaz para remover digoxina ou substituir Fab.","reference":"AHA 2025; bula FDA Digoxin Immune Fab 2025"},{"title":"Qual plano de continuidade evita nova intoxicação?","domain":"Reconciliação e prevenção de recorrência","correct":1,"feedback":"Após estabilização, confirme indicação e dose à luz da função renal e das interações, reconstrua o uso real e organize um plano de administração compreensível, com consentimento para envolver familiares. Suspenda até revisão clínica e programe acompanhamento de ECG, função renal e sintomas. Decisões de longo prazo devem ser individualizadas e compartilhadas com equipe cardiológica.","reference":"AHA 2025; bula FDA Digoxin Immune Fab 2025"}];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda10' || state.finished !== true || state.step !== STEPS.length) return null;
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
      key: `agoraatenda10-step-${index + 1}`,
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
      caseId: 'agoraatenda10',
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
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda10').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 10.' });
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
