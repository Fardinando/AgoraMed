'use strict';

const { json, envFaltando, sessaoPerfil, postgrest, podeAcessarCurso } = require('../api');

const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS = [{"title":"Qual dado torna a furosemida central neste cenário?","domain":"Congestão, potássio e prioridade","correct":1,"feedback":"A congestão é objetiva e a diurese ainda existe. Furosemida IV é indicada para tratar retenção de volume na IC descompensada e pode favorecer excreção renal de K⁺. Como o K⁺ é 6,1 e há lesão renal aguda, siga também o protocolo hospitalar para hipercalemia moderada, considerando medidas de redistribuição conforme avaliação clínica. ECG sem alterações não exclui risco; evite volume indiscriminado.","reference":"AHA/ACC/HFSA 2022, diuréticos na IC hospitalizada; UKKA 2026, uso de diuréticos e hipercalemia."},{"title":"Como prescrever e individualizar a furosemida IV?","domain":"Dose individualizada e resposta ao diurético","correct":3,"feedback":"Dose e via devem considerar dose oral de manutenção, congestão, função renal, pressão e protocolo institucional. A administração IV oferece efeito mais previsível na descompensação. Registre horário, dose, diurese e resposta; se descongestão for inadequada, reavalie e titule a estratégia em vez de presumir falha renal ou repetir dose às cegas.","reference":"AHA/ACC/HFSA 2022 e ESC 2026 para furosemida IV, titulação e reavaliação de resposta."},{"title":"Como saber cedo se a dose funcionou?","domain":"Reavaliação precoce da diurese","correct":0,"feedback":"A resposta deve ser avaliada cedo, usando débito urinário horário e, quando disponível, sódio urinário pontual, junto de sinais de congestão, pressão e perfusão. Diretrizes ESC usam resposta urinária/natriurética nas primeiras horas para orientar ajuste; os alvos são ferramentas, não substitutos da avaliação individual. Se a resposta for insuficiente e a congestão persistir, equipe pode intensificar diurético IV ou associar estratégia conforme protocolo.","reference":"ESC 2026, avaliação precoce da resposta diurética na IC aguda; AHA/ACC/HFSA 2022."},{"title":"O potássio começou a cair. O que explica a resposta?","domain":"Mecanismo e resposta da furosemida","correct":2,"feedback":"Diuréticos de alça aumentam fluxo e oferta de sódio distal, o que pode aumentar excreção renal de K⁺. A melhora simultânea de congestão e potássio é coerente com resposta clínica, mas não prova resolução completa nem garante persistência do efeito. Acompanhe K⁺, Mg²⁺, creatinina, pressão, peso e balanço. A resposta não deve ser extrapolada para hipovolemia, anúria ou oligúria importante.","reference":"UKKA 2026, mecanismo dos diuréticos e condições para uso; diretrizes de IC AHA/ACC/HFSA."},{"title":"Como manejar os fármacos que contribuem para hipercalemia?","domain":"Terapia cardioprotetora e prevenção","correct":3,"feedback":"Considere dose, gravidade/tendência do K⁺, pressão e função renal. Pode ser necessária pausa ou ajuste durante doença aguda, mas suspensão permanente automática pode retirar tratamento cardioprotetor importante. Corrija fatores reversíveis e defina plano de reavaliação e eventual reintrodução com monitorização laboratorial e acompanhamento.","reference":"UKKA 2026 sobre otimização de medicações cardioprotetoras; AHA/ACC/HFSA 2022 sobre terapia dirigida por diretriz na HFrEF."},{"title":"É possível concluir o caso sem hemodiálise?","domain":"Resposta favorável e limites da conclusão","correct":1,"feedback":"Neste caso simulado, a diurese e descongestão foram adequadas, o K⁺ normalizou nos controles e não surgiu outra indicação urgente de terapia renal substitutiva. Isso permite seguir sem diálise neste cenário, não afirmar que furosemida a evita em geral. Continue acompanhando K⁺, creatinina, Mg²⁺, pressão, peso e sintomas, com plano diurético e revisão da terapia da IC na transição do cuidado.","reference":"UKKA 2026; ESC 2026 e AHA/ACC/HFSA 2022: contexto de diuréticos, resposta e indicações para escalonamento."}];

function avaliar(state) {
  if (!state || state.caseId !== 'agoraatenda06' || state.finished !== true || state.step !== STEPS.length) return null;
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
      key: `agoraatenda06-step-${index + 1}`,
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
      caseId: 'agoraatenda06',
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
      const attempts = r.dados.filter(row => row.estado?.caseId === 'agoraatenda06').slice(0, 25).map(row => ({ id: row.id, finishedAt: row.finalizada_em, state: row.estado, result: row.resultado }));
      return json(res, 200, { ok: true, attempts });
    }

    const body = req.body || {};
    if (!UUID.test(String(body.operationId || ''))) return json(res, 400, { ok: false, erro: 'Não foi possível identificar esta tentativa.' });
    const attempt = avaliar(body.state);
    if (!attempt) return json(res, 400, { ok: false, erro: 'A tentativa está incompleta ou não corresponde ao Caso 6.' });
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
