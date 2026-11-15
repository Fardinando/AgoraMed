(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const stages = $$('.af-stage');
  const stepButtons = $$('.af-step-nav button');
  const progress = $('#progress-bar');
  const stageNames = ['Explorar apresentação', 'Entender a ação', 'Fazer a conversão', 'Montar a prescrição'];
  const facts = {
    concentration: {
      label: 'DADO DO RÓTULO', title: 'Concentração', value: '10% · 100 mg/mL',
      description: 'Para este exercício, use gluconato de cálcio 10%: cada mililitro contém 100 mg de gluconato de cálcio.',
      extra: '10% (m/v) significa 10 g em 100 mL, equivalente a 100 mg/mL. A ampola de referência contém 10 mL.'
    },
    volume: {
      label: 'DADO DO RÓTULO', title: 'Volume por ampola', value: '10 mL',
      description: 'A ampola usada como referência nesta estação contém 10 mL. A dose de 30 mL corresponde a três ampolas.',
      extra: 'Para a prática, mantenha este padrão único: 10 mL por ampola.'
    },
    form: {
      label: 'DADO DO RÓTULO', title: 'Forma farmacêutica', value: 'Solução para diluição para infusão',
      description: 'Solução injetável para administração intravenosa.',
      extra: 'Para hipercalemia, a UKKA 2026 orienta administrar a solução de gluconato de cálcio 10% sem diluição.'
    }
  };
  const state = { current: 0, currentFact: 'concentration', explored: new Set(), mechanismCorrect: false, conversionCorrect: false, submitted: false };

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
    if (index === 1) return state.explored.size === 3;
    if (index === 2) return state.mechanismCorrect;
    if (index === 3) return state.conversionCorrect;
    return false;
  }

  function showStage(index, focusHeading = true) {
    if (index < 0 || index >= stages.length || !canEnter(index)) return;
    state.current = index;
    stages.forEach((stage, i) => { stage.hidden = i !== index; });
    updateProgress();
    $('#stage-announcement').textContent = `Etapa ${index + 1} de 4: ${stageNames[index]}.`;
    if (focusHeading) {
      const heading = $('[data-stage="' + index + '"] h2');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateAdvanceButtons() {
    $('[data-stage="0"] [data-next]').disabled = state.explored.size !== 3;
    $('[data-stage="1"] [data-next]').disabled = !state.mechanismCorrect;
    $('[data-stage="2"] [data-next]').disabled = !state.conversionCorrect;
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
    updateAmpouleReadStatus();
    updateAdvanceButtons();
  }

  $$('.af-fact-select').forEach(button => button.addEventListener('click', () => showFact(button.dataset.fact)));
  function updateAmpouleReadStatus() {
    const count = state.explored.size;
    const currentSeen = state.explored.has(state.currentFact);
    $('#ampoule-read-status').textContent = `${count} de 3 dados vistos`;
    $$('.af-fact-check').forEach(check => { check.hidden = !state.explored.has(check.dataset.factCheck); });
    const confirmButton = $('#mark-current-fact');
    confirmButton.setAttribute('aria-pressed', String(currentSeen));
    confirmButton.textContent = currentSeen ? 'Visto ✓ · marcar novamente' : 'Marcar este dado como visto';
    updateAdvanceButtons();
  }
  $('#mark-current-fact').addEventListener('click', () => {
    if (state.explored.has(state.currentFact)) state.explored.delete(state.currentFact);
    else state.explored.add(state.currentFact);
    updateAmpouleReadStatus();
  });
  $('#ampoule-title').addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' && state.explored.size === 3) showStage(1);
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStage(state.current + 1)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStage(state.current - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.step))));

  $('#check-mechanism').addEventListener('click', () => {
    const answer = $('input[name="calcium-effect"]:checked');
    const feedback = $('#mechanism-feedback');
    if (!answer) {
      feedback.className = 'is-wrong';
      feedback.textContent = 'Selecione uma resposta para conferir.';
      return;
    }
    state.mechanismCorrect = answer.value === 'no';
    feedback.className = state.mechanismCorrect ? 'is-correct' : 'is-wrong';
    feedback.textContent = state.mechanismCorrect
      ? 'Correto. O cálcio estabiliza temporariamente a membrana cardíaca; não desloca nem remove potássio. A hipercalemia ainda precisa de tratamento específico e reavaliação.'
      : 'Revise o mecanismo: o cálcio protege temporariamente o coração, mas não reduz o potássio sérico. Escolha a alternativa que diferencia proteção elétrica de tratamento do potássio.';
    updateAdvanceButtons();
  });
  $$('input[name="calcium-effect"]').forEach(input => input.addEventListener('change', () => {
    state.mechanismCorrect = false;
    $('#mechanism-feedback').textContent = '';
    $('#mechanism-feedback').className = '';
    updateAdvanceButtons();
  }));

  $('#check-conversion').addEventListener('click', () => {
    const selected = $('input[name="ampoule-answer"]:checked');
    const feedback = $('#conversion-feedback');
    if (!selected) {
      feedback.hidden = false;
      feedback.className = 'af-feedback';
      feedback.textContent = 'Escolha uma resposta antes de conferir.';
      return;
    }
    state.conversionCorrect = selected.value === '3';
    feedback.hidden = false;
    feedback.className = state.conversionCorrect ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.conversionCorrect
      ? 'Correto: 30 mL ÷ 10 mL por ampola = 3 ampolas. Guarde o padrão desta estação: 10% = 100 mg/mL e cada ampola contém 10 mL.'
      : `Ainda não. Divida o volume prescrito pelo conteúdo por ampola: 30 mL ÷ 10 mL = 3 ampolas. Você marcou ${selected.value}. Refaça a escolha para liberar a próxima etapa.`;
    updateAdvanceButtons();
  });
  $$('input[name="ampoule-answer"]').forEach(input => input.addEventListener('change', () => {
    state.conversionCorrect = false;
    $('#conversion-feedback').hidden = true;
    updateAdvanceButtons();
  }));
  const fieldChecks = [
    ['drug', 'rx-drug', value => value === 'gluconato', 'Selecione gluconato de cálcio.'],
    ['presentation', 'rx-presentation', value => value === 'reference', 'Use o padrão desta estação: solução a 10%, 100 mg/mL, ampola de 10 mL.'],
    ['dose', 'rx-dose', value => Number(value) === 30, 'Para esta prática, a referência escolhida é 30 mL de gluconato de cálcio 10% para alteração no ECG, conforme UKKA 2026.'],
    ['unit', 'rx-unit', value => value === 'mL', 'Expresse esta dose em mL. Com a ampola de 10 mL selecionada, 30 mL correspondem a 3 ampolas.'],
    ['route', 'rx-route', value => value === 'IV', 'Use exclusivamente a via intravenosa. As vias intramuscular e subcutânea são proibidas pelo risco de lesão e necrose tecidual.'],
    ['time', 'rx-time', value => value === '10', 'A UKKA 2026 indica administrar 30 mL de gluconato de cálcio 10% em 10 minutos.'],
    ['prep', 'rx-prep', value => value === true, 'Padrão da estação: administrar sem diluição, conforme UKKA 2026. Se o protocolo local indicar diluição, usar somente solução compatível (glicose 5% ou cloreto de sódio 0,9%) e lavar o acesso. Não misturar com bicarbonato ou fosfato.']
  ];

  function presentationText() {
    const value = $('#rx-presentation').value;
    if (value === 'reference') return 'Gluconato de cálcio 10% (100 mg/mL), solução injetável, ampola de 10 mL';
    return 'apresentação não selecionada';
  }

  function reviewPrescription(event) {
    event.preventDefault();
    state.submitted = true;
    const results = fieldChecks.map(([key, id, valid, explanation]) => {
      const element = $('#' + id);
      const value = element.type === 'checkbox' ? element.checked : element.value;
      return { key, valid: valid(value), explanation };
    });
    const checks = [
      ['ECG contínuo', $('#rx-ecg').checked],
      ['pressão arterial e frequência cardíaca', $('#rx-bp').checked],
      ['observação do acesso/local de infusão', $('#rx-site').checked],
      ['reavaliação do ECG e continuidade do tratamento do potássio', $('#rx-recheck').checked]
    ];
    const monitoringValid = checks.every(([, checked]) => checked);
    const monitoringFeedback = monitoringValid
      ? 'ECG, pressão arterial, frequência cardíaca, acesso venoso e reavaliação foram contemplados.'
      : 'Complete os itens pendentes: ' + checks.filter(([, checked]) => !checked).map(([label]) => label).join('; ') + '.';
    results.push({ key: 'monitoring', valid: monitoringValid, explanation: monitoringFeedback });

    results.forEach(result => {
      const target = $('[data-feedback="' + result.key + '"]');
      target.className = 'field-feedback ' + (result.valid ? 'good' : 'bad');
      target.textContent = (result.valid ? 'Correto. ' : 'Revise. ') + result.explanation;
      const definition = fieldChecks.find(([key]) => key === result.key);
      const field = definition ? $('#' + definition[1]) : null;
      if (field) {
        target.id = 'feedback-' + result.key;
        field.setAttribute('aria-describedby', target.id);
        field.setAttribute('aria-invalid', String(!result.valid));
      }
    });
    const score = results.filter(result => result.valid).length;
    const complete = score === results.length;
    const volume = $('#rx-dose').value.trim() || '___';
    const unit = $('#rx-unit').value || '___';
    const route = $('#rx-route').value || '___';
    const duration = $('#rx-time').selectedOptions[0]?.textContent || '___';
    const presentation = presentationText();
    const drugName = 'Gluconato de cálcio';
    const presentationApplicable = presentation;
    const ampouleCount = unit === 'mL' && Number(volume) > 0 && $('#rx-presentation').value ? (Number(volume) / 10) : null;
    const countText = ampouleCount && Number.isInteger(ampouleCount) ? ` (${ampouleCount} ampolas de 10 mL)` : '';
    const prepText = $('#rx-prep').checked ? 'padrão desta estação: administrar sem diluição; se protocolo local orientar diluição, usar apenas glicose 5% ou cloreto de sódio 0,9%; lavar o acesso' : 'preparo não registrado';
    const text = `${drugName} — ${volume} ${unit}${countText}; apresentação: ${presentationApplicable}; via ${route}; administrar em ${duration}. Preparo: ${prepText}. Monitorização: ${checks.map(([label, checked]) => checked ? label : null).filter(Boolean).join(', ') || 'não registrada'}.`;
    $('#assembled-rx').textContent = text;
    $('#result-score').textContent = `${score} de ${results.length} campos corretos`;
    $('#result-title').textContent = complete ? 'Prescrição completa para esta referência.' : 'Confira os campos que precisam de ajuste.';
    $('#field-review').innerHTML = results.map(result => `<li class="${result.valid ? 'good' : 'bad'}"><strong>${result.valid ? 'Adequado' : 'Ajustar'}:</strong> ${escapeHTML(result.explanation)}</li>`).join('');
    $('#prescription-result').hidden = false;
    $('#rx-form-status').textContent = complete
      ? 'Você preencheu os campos essenciais desta prática.'
      : 'A ordem está montada para revisão. Use o feedback por campo e envie novamente após os ajustes.';
    const stageHeader = $('[data-stage="3"] .af-section-head');
    if (complete) {
      $('#progress-bar').setAttribute('aria-valuenow', '100');
      $('#progress-fill').style.width = '100%';
      $('#progress-detail').textContent = 'Estação concluída';
      $('#progress-label').textContent = 'Etapa 4 de 4 · concluída';
      stageHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#result-title').focus?.();
    }
    $('#prescription-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  $('#prescription-form').addEventListener('submit', reviewPrescription);
  updateProgress();
  updateAmpouleReadStatus();
  updateAdvanceButtons();
})();
