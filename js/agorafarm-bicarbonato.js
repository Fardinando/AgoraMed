(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const stages = $$('.af-stage');
  const stepButtons = $$('.af-step-nav button');
  const stageNames = ['Explorar a apresentação', 'Entender a indicação', 'Fazer a conversão', 'Montar a prescrição'];
  const facts = {
    concentration: { label: 'RENAME 2024 · CONCENTRAÇÃO', title: 'Concentração', value: '8,4% · 84 mg/mL', description: 'A RENAME lista bicarbonato de sódio injetável na concentração de 84 mg por mL.', extra: '8,4% (m/v) significa 8,4 g em 100 mL, ou 84 mg em cada mL.' },
    equivalence: { label: 'EQUIVALÊNCIA · RÓTULO', title: 'Equivalência em mEq', value: '1 mEq/mL', description: 'Cada mililitro fornece 1 mEq de bicarbonato e 1 mEq de sódio.', extra: 'Nesta apresentação, mL e mEq têm o mesmo valor numérico. Isso facilita a conversão, mas não define uma dose clínica.' },
    ampoule: { label: 'VOLUME ILUSTRATIVO', title: 'Ampola de referência', value: '10 mL · 10 mEq', description: 'A ilustração usa uma ampola de 10 mL, equivalente a 10 mEq e 840 mg de bicarbonato de sódio.', extra: 'O volume da ampola pode variar conforme a apresentação disponível. Confira o rótulo antes de calcular a quantidade.' }
  };
  const state = { current: 0, currentFact: 'concentration', explored: new Set(), mechanismCorrect: false, volumeCorrect: false };
  const progress = $('#progress-bar');

  function updateProgress() {
    const percent = Math.round(((state.current + 1) / stages.length) * 100);
    progress.setAttribute('aria-valuenow', String(percent));
    $('#progress-fill').style.width = percent + '%';
    $('#progress-label').textContent = `Etapa ${state.current + 1} de ${stages.length}`;
    $('#progress-detail').textContent = stageNames[state.current];
    stepButtons.forEach((button, index) => {
      if (index === state.current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.classList.toggle('is-done', index < state.current);
    });
  }
  function canEnter(index) {
    if (index <= state.current) return true;
    if (index === 1) return state.explored.size === Object.keys(facts).length;
    if (index === 2) return state.mechanismCorrect;
    if (index === 3) return state.volumeCorrect;
    return false;
  }
  function showStage(index, focusHeading = true) {
    if (index < 0 || index >= stages.length || !canEnter(index)) return;
    state.current = index;
    stages.forEach((stage, i) => { stage.hidden = i !== index; });
    updateProgress();
    $('#stage-announcement').textContent = `Etapa ${index + 1} de 4: ${stageNames[index]}.`;
    if (focusHeading) {
      const heading = $(`[data-stage="${index}"] h2`);
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function updateReadStatus() {
    $('#read-status').textContent = `${state.explored.size} de ${Object.keys(facts).length} dados vistos`;
    $$('.af-fact-check').forEach(check => { check.hidden = !state.explored.has(check.dataset.factCheck); });
    const button = $('#mark-current-fact');
    const seen = state.explored.has(state.currentFact);
    button.setAttribute('aria-pressed', String(seen));
    button.textContent = seen ? 'Visto ✓ · marcar novamente' : 'Marcar este dado como visto';
    $('[data-stage="0"] [data-next]').disabled = state.explored.size !== Object.keys(facts).length;
  }
  function showFact(key) {
    const fact = facts[key];
    if (!fact) return;
    state.currentFact = key;
    $$('.af-fact-select').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fact === key)));
    $('#fact-label').textContent = fact.label;
    $('#fact-title').textContent = fact.title;
    $('#fact-value').textContent = fact.value;
    $('#fact-description').textContent = fact.description;
    $('.af-fact-extra span').textContent = fact.extra;
    updateReadStatus();
  }

  $$('.af-fact-select').forEach(button => button.addEventListener('click', () => showFact(button.dataset.fact)));
  $('#mark-current-fact').addEventListener('click', () => {
    if (state.explored.has(state.currentFact)) state.explored.delete(state.currentFact);
    else state.explored.add(state.currentFact);
    updateReadStatus();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStage(state.current + 1)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStage(state.current - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.step))));

  $('#check-mechanism').addEventListener('click', () => {
    const answer = $('input[name="bicarb-role"]:checked');
    const feedback = $('#mechanism-feedback');
    if (!answer) {
      feedback.className = 'is-wrong';
      feedback.textContent = 'Selecione uma resposta antes de conferir.';
      return;
    }
    state.mechanismCorrect = answer.value === 'notroutine';
    feedback.className = state.mechanismCorrect ? 'is-correct' : 'is-wrong';
    feedback.textContent = state.mechanismCorrect
      ? 'Correto. A UKKA 2026 não recomenda bicarbonato IV rotineiramente para hipercalemia aguda. Ele pode ter lugar no tratamento de acidose metabólica selecionada, mas a equipe deve tratar o potássio com medidas apropriadas e monitorar a resposta.'
      : 'Revise a indicação: a UKKA 2026 não recomenda bicarbonato IV de rotina para reduzir o potássio na hipercalemia aguda. A correção de acidose é uma decisão distinta e depende do quadro clínico.';
    $('[data-stage="1"] [data-next]').disabled = !state.mechanismCorrect;
  });
  $$('input[name="bicarb-role"]').forEach(input => input.addEventListener('change', () => {
    state.mechanismCorrect = false;
    $('#mechanism-feedback').textContent = '';
    $('#mechanism-feedback').className = '';
    $('[data-stage="1"] [data-next]').disabled = true;
  }));

  $('#check-volume').addEventListener('click', () => {
    const answer = $('input[name="bicarb-volume"]:checked');
    const feedback = $('#volume-feedback');
    feedback.hidden = false;
    if (!answer) {
      state.volumeCorrect = false;
      feedback.className = 'af-feedback';
      feedback.textContent = 'Escolha uma resposta antes de conferir.';
      return;
    }
    state.volumeCorrect = answer.value === '20';
    feedback.className = state.volumeCorrect ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.volumeCorrect
      ? 'Cálculo correto: 20 mEq ÷ 1 mEq/mL = 20 mL. Se a ampola disponível tiver 10 mL, isso corresponde a 2 ampolas. O cálculo converte unidades; não recomenda dose para hipercalemia.'
      : `Recalcule: 20 mEq ÷ 1 mEq/mL = 20 mL. A equivalência numérica entre mEq e mL decorre da concentração de 1 mEq/mL.`;
    $('[data-stage="2"] [data-next]').disabled = !state.volumeCorrect;
  });
  $$('input[name="bicarb-volume"]').forEach(input => input.addEventListener('change', () => {
    state.volumeCorrect = false;
    $('#volume-feedback').hidden = true;
    $('[data-stage="2"] [data-next]').disabled = true;
  }));

  $('#prescription-form').addEventListener('submit', event => {
    event.preventDefault();
    const dose = Number($('#rx-dose').value);
    const expectedVolume = dose / 1;
    const checks = [
      ['drug', 'rx-drug', value => value === 'bicarbonate', 'Selecione bicarbonato de sódio.'],
      ['presentation', 'rx-presentation', value => value === '84', 'Selecione a solução injetável a 8,4% (84 mg/mL; 1 mEq/mL).'],
      ['dose', 'rx-dose', value => value === '20', 'Use os 20 mEq já definidos para este cenário de prática; não extrapole como dose universal.'],
      ['volume', 'rx-volume', value => Number(value) === 20 && dose === 20, 'A 1 mEq/mL, 20 mEq correspondem a 20 mL.'],
      ['finalvolume', 'rx-final-volume', value => Number(value) === 40 && dose === 20, 'Neste exemplo de manual hospitalar, 20 mEq em 40 mL finais resultam em 0,5 mEq/mL.'],
      ['diluent', 'rx-diluent', value => value === 'sf' || value === 'sg', 'Selecione um dos diluentes compatíveis descritos no manual consultado e confirme a compatibilidade do produto local.'],
      ['route', 'rx-route', value => value === 'iv', 'Para esta ordem simulada com solução injetável, selecione via intravenosa.'],
      ['time', 'rx-time', value => value === '120', 'O exemplo do manual consultado orienta infusão intermitente em 2 horas; não generalize como orientação universal.']
    ];
    const results = checks.map(([key, id, valid, explanation]) => {
      const input = $('#' + id);
      const ok = valid(input.value);
      const target = $(`[data-feedback="${key}"]`);
      target.className = 'field-feedback ' + (ok ? 'good' : 'bad');
      target.textContent = (ok ? 'Adequado. ' : 'Revise. ') + explanation;
      target.id = 'feedback-' + key;
      input.setAttribute('aria-describedby', target.id);
      input.setAttribute('aria-invalid', String(!ok));
      return { key, valid: ok, explanation };
    });
    const prepOk = $('#rx-dose-defined').checked && $('#rx-final-concentration').checked && $('#rx-line').checked;
    const prepExplanation = prepOk
      ? 'A dose foi identificada como própria do exercício, a concentração final foi calculada e o acesso/compatibilidade foram considerados.'
      : 'Confirme que a quantidade pertence ao cenário, confira 20 mEq em 40 mL finais (0,5 mEq/mL) e avalie acesso e compatibilidade.';
    results.push({ key: 'prep', valid: prepOk, explanation: prepExplanation });
    const monitoringOk = $('#rx-monitor-acidbase').checked && $('#rx-monitor-electrolytes').checked;
    const monitoringExplanation = monitoringOk
      ? 'O plano inclui reavaliação ácido-base, eletrólitos e estado volêmico.'
      : 'Inclua reavaliação de gasometria/pH e bicarbonato, sódio, potássio, cálcio ionizado e estado volêmico.';
    results.push({ key: 'monitoring', valid: monitoringOk, explanation: monitoringExplanation });
    for (const item of results.filter(item => item.key === 'prep' || item.key === 'monitoring')) {
      const target = $(`[data-feedback="${item.key}"]`);
      target.className = 'field-feedback ' + (item.valid ? 'good' : 'bad');
      target.textContent = (item.valid ? 'Adequado. ' : 'Revise. ') + item.explanation;
    }
    const score = results.filter(item => item.valid).length;
    const complete = score === results.length;
    const diluentName = $('#rx-diluent').selectedOptions[0]?.textContent || 'diluente não selecionado';
    const timeName = $('#rx-time').selectedOptions[0]?.textContent || 'tempo a definir';
    $('#assembled-rx').textContent = `Bicarbonato de sódio solução injetável 8,4% (84 mg/mL; 1 mEq/mL): ${dose || 'dose não selecionada'} mEq (${Number.isFinite(expectedVolume) ? expectedVolume : 'volume a calcular'} mL), diluir em ${diluentName}, completar para volume final de ${$('#rx-final-volume').value || 'a definir'} mL e infundir por via intravenosa em ${timeName}. Esta ordem é apenas a simulação de um caso com acidose previamente avaliada; não constitui dose-padrão para hipercalemia aguda. Monitorar acesso, gasometria, eletrólitos e estado volêmico.`;
    $('#result-score').textContent = `${score} de ${results.length} campos adequados`;
    $('#result-title').textContent = complete ? 'Ordem completa para o cenário didático.' : 'Confira os campos que precisam de ajuste.';
    $('#field-review').innerHTML = results.map(item => `<li class="${item.valid ? 'good' : 'bad'}"><strong>${item.valid ? 'Adequado' : 'Ajustar'}:</strong> ${escapeHTML(item.explanation)}</li>`).join('');
    $('#prescription-result').hidden = false;
    $('#rx-form-status').textContent = complete ? 'Você incluiu os itens essenciais desta prática.' : 'A ordem foi montada para revisão. Use o feedback por campo e confira novamente.';
    if (complete) {
      progress.setAttribute('aria-valuenow', '100');
      $('#progress-fill').style.width = '100%';
      $('#progress-detail').textContent = 'Estação concluída';
      $('#progress-label').textContent = 'Etapa 4 de 4 · concluída';
    }
    $('#prescription-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#result-title').focus({ preventScroll: true });
  });
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  updateProgress();
  showFact('concentration');
  $('[data-stage="1"] [data-next]').disabled = true;
  $('[data-stage="2"] [data-next]').disabled = true;
})();
