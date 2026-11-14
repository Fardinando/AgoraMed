'use strict';
const { createHash } = require('node:crypto');

const TIPOS = Object.freeze([
  'quiz_question_presented',
  'quiz_answer_submitted',
  'quiz_answer_evaluated',
  'quiz_explanation_viewed',
  'quiz_question_flagged_for_review',
  'quiz_review_completed',
  'quiz_competency_progress_updated'
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function idempotente(operacao, tipo, questaoId) {
  if (!UUID.test(operacao || '') || !TIPOS.includes(tipo) || typeof questaoId !== 'string') {
    throw new Error('Identidade do evento inválida.');
  }
  const hex = createHash('sha256').update(`${operacao}:${tipo}:${questaoId}`).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const s = hex.join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

function competencias(q) {
  const m = q && q.metadata;
  if (!m) return [];
  return [...new Set([m.primary_competency, ...(m.secondary_competencies || [])]
    .filter(id => typeof id === 'string' && /^[a-z][a-z0-9_]{1,79}$/.test(id)))];
}

function campos({ id, usuarioId, cursoId, tentativaId, questaoId, versao, tipo, modalidade,
  alternativa = null, correta = null, tempoMs = null, competencias: competencyIds = [], estadoRevisao = 'nao_avaliado' }) {
  if (!UUID.test(id || '') || !UUID.test(usuarioId || '') || !UUID.test(cursoId || '') ||
      !UUID.test(tentativaId || '') || !/^aqz-hiper-\d{3}$/.test(questaoId || '') ||
      !Number.isSafeInteger(versao) || versao < 1 || !TIPOS.includes(tipo) ||
      !['estudo','simulado'].includes(modalidade) ||
      (alternativa !== null && !['A','B','C','D'].includes(alternativa)) ||
      (correta !== null && typeof correta !== 'boolean') ||
      (tempoMs !== null && (!Number.isSafeInteger(tempoMs) || tempoMs < 0 || tempoMs > 3600000)) ||
      !Array.isArray(competencyIds) || !['nao_avaliado','precisa_revisar','em_revisao','dominada'].includes(estadoRevisao)) {
    throw new Error('Dados do evento inválidos.');
  }
  return { p_id:id, p_usuario:usuarioId, p_curso:cursoId, p_tentativa:tentativaId, p_questao:questaoId,
    p_versao:versao, p_tipo:tipo, p_modalidade:modalidade, p_alternativa:alternativa,
    p_correta:correta, p_tempo_ms:tempoMs, p_competencias:competencyIds, p_estado_revisao:estadoRevisao,
    p_ocorrido_em:new Date().toISOString() };
}

async function registrar(postgrest, dados) {
  return postgrest('/rpc/agoraquiz_registrar_evento', { metodo:'POST', servico:true, corpo:dados });
}

module.exports = { TIPOS, UUID, idempotente, competencias, campos, registrar };
