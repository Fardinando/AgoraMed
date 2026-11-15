'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [{"title":"Qual é a prioridade imediata na sala vermelha?","domain":"RCP, ritmo e causas reversíveis","correct":3,"feedback":"A prioridade é ressuscitação de alta qualidade e algoritmo guiado pelo ritmo, com investigação simultânea de causas reversíveis. Suspeita de hipercalemia deve entrar cedo no raciocínio, mas não substitui compressões, ventilação, desfibrilação quando indicada e coordenação da equipe.","reference":"AHA 2025; UKKA 2026"},{"title":"O que fazer com a reposição de potássio?","domain":"Interromper a exposição e reconciliar a prescrição","correct":0,"feedback":"A indicação original de reposição pode deixar de ser válida quando o K⁺ se corrige. Com K⁺ atual 8,1 e PCR, pare imediatamente a fonte, reconstrua doses e horários, confira função renal e comunique a equipe. Preserve o registro para entender a sequência e prevenir recorrência; não se deve suspender a RCP para essa revisão.","reference":"UKKA 2026"},{"title":"Como interpretar as terapias específicas durante a PCR?","domain":"Evidência e protocolos para hipercalemia em PCR","correct":1,"feedback":"O raciocínio deve identificar a hipercalemia como causa potencialmente reversível e tratar sem interromper ressuscitação. A AHA 2025 descreve como não bem estabelecida a eficácia de cálcio, bicarbonato e insulina-glicose na PCR por hipercalemia; protocolos UK de situações especiais podem propor intervenções específicas. Essa diferença deve ser comunicada e resolvida pelo protocolo institucional e liderança clínica, não misturada silenciosamente.","reference":"AHA 2025; UKKA 2026; Resuscitation Council UK 2025"},{"title":"O ritmo é chocável. O que muda?","domain":"Tratamento do ritmo e cuidado simultâneo","correct":2,"feedback":"Desfibrilação é prioritária no ritmo chocável. Retome compressões imediatamente após o choque e mantenha ciclos de ressuscitação; integrantes da equipe podem executar em paralelo intervenções para a causa reversível. Não condicione choque ou RCP à normalização do potássio.","reference":"AHA 2025"},{"title":"Após o retorno da circulação, o que precisa continuar?","domain":"Pós-ROSC, rebote e remoção de potássio","correct":3,"feedback":"Depois do ROSC, mantenha cuidado pós-parada e trate a causa. A redistribuição pode ser temporária, e o K⁺ pode permanecer alto ou voltar a subir. Reavalie ECG, potássio, glicemia após insulina, função renal, diurese e necessidade de remoção definitiva; reconstrua as doses de KCl recebidas.","reference":"AHA 2025; UKKA 2026"},{"title":"Que dados ajudam a reconstruir a cadeia de exposição?","domain":"Reconstrução da exposição e cronologia","correct":0,"feedback":"Distinguir prescrito de administrado é essencial para entender causalidade e tratar o paciente. Reconcilie ordem original, alterações, registro de administração, horários dos exames, função renal e comunicação em cada transição. A cronologia orienta tratamento e análise de segurança; não substitui cuidado emergencial.","reference":"UKKA 2026"},{"title":"Como prevenir uma repetição desse evento?","domain":"Segurança medicamentosa e prevenção sistêmica","correct":2,"feedback":"Ordens de reposição precisam ter indicação, dose, critérios de repetição e reavaliação/encerramento. Handover e reconciliação devem verificar resultados recentes, função renal, doses administradas e ordens ainda ativas. Uma análise sistêmica pode identificar barreiras para prescrição copiada, alertas e documentação sem transformar um evento complexo em culpa de uma pessoa.","reference":"UKKA 2026"},{"title":"Como tornar a futura reposição mais segura?","domain":"Barreiras de segurança na prescrição","correct":1,"feedback":"Uma ordem segura deixa clara a indicação, dose e duração, quando reavaliar o K⁺ e como suspender a reposição. Reconciliação em cada plantão/transição e revisão dos resultados ajudam a impedir a continuidade inadvertida. Alertas podem apoiar, mas não substituem responsabilidade compartilhada nem análise do processo.","reference":"UKKA 2026"}];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda08' || state.finished !== true || state.step !== STEPS.length) return null;
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
      key: `agoraatenda08-step-${index + 1}`,
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
      caseId: 'agoraatenda08',
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
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda08').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 8.' });
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
