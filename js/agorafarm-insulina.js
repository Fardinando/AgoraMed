(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const stages = $$('.af-stage');
  const stepButtons = $$('.af-step-nav button');
  const stageNames = ['Explorar apresentação', 'Entender a ação', 'Fazer os cálculos', 'Montar a prescrição'];
  const facts = {
    concentration: { label: 'DADO DO RÓTULO', title: 'Concentração', value: '100 UI/mL', description: 'Cada mililitro contém 100 unidades internacionais de insulina humana regular.', extra: 'Nesta concentração, 10 UI correspondem matematicamente a 0,1 mL. A dose deve ser aspirada com seringa de insulina graduada em UI.' },
    volume: { label: 'DADO DO RÓTULO', title: 'Volume do frasco-ampola', value: '10 mL', description: 'O frasco-ampola usado como referência nesta estação contém 10 mL, totalizando 1.000 UI.', extra: 'A apresentação de referência é um frasco-ampola de 10 mL. Apresentações disponíveis podem variar de acordo com o serviço.' },
    form: { label: 'DADO DO RÓTULO', title: 'Forma farmacêutica', value: 'Solução injetável · uso IV nesta indicação', description: 'A estação trata do uso intravenoso da insulina humana regular como parte do esquema insulina-glicose para hipercalemia.', extra: 'O uso IV nesta estação é específico para o protocolo de hipercalemia. Não confunda com a via de administração habitual do tratamento do diabetes.' }
  };
  const state = { current: 0, currentFact: 'concentration', explored: new Set(), mechanismCorrect: false, insulinCorrect: false, glucoseCorrect: false, submitted: false };
  const progress = $('#progress-bar');

  function updateProgress() {
    const percent = Math.round(((state.current + 1) / stages.length) * 100);
    progress.setAttribute('aria-valuenow', String(percent));
    $('#progress-fill').style.width = percent + '%';
    $('#progress-label').textContent = `Etapa ${state.current + 1} de ${stages.length}`;
    $('#progress-detail').textContent = stageNames[state.current];
    stepButtons.forEach((button, index) => {
      if (index === state.current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.classList.toggle('is-done', index < state.current);
    });
  }
  function canEnter(index) {
    if (index <= state.current) return true;
    if (index === 1) return state.explored.size === 3;
    if (index === 2) return state.mechanismCorrect;
    if (index === 3) return state.insulinCorrect && state.glucoseCorrect;
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
      heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function updateReadStatus() {
    const count = state.explored.size;
    const currentSeen = state.explored.has(state.currentFact);
    $('#ampoule-read-status').textContent = `${count} de 3 dados vistos`;
    $$('.af-fact-check').forEach(check => { check.hidden = !state.explored.has(check.dataset.factCheck); });
    const button = $('#mark-current-fact');
    button.setAttribute('aria-pressed', String(currentSeen));
    button.textContent = currentSeen ? 'Visto ✓ · marcar novamente' : 'Marcar este dado como visto';
    $('[data-stage="0"] [data-next]').disabled = count !== 3;
  }
  function showFact(key) {
    const fact = facts[key]; if (!fact) return;
    state.currentFact = key;
    $$('.af-fact-select').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fact === key)));
    $('#fact-label').textContent = fact.label; $('#fact-title').textContent = fact.title;
    $('#fact-value').textContent = fact.value; $('#fact-description').textContent = fact.description;
    $('.af-fact-extra span').textContent = fact.extra; updateReadStatus();
  }
  $$('.af-fact-select').forEach(button => button.addEventListener('click', () => showFact(button.dataset.fact)));
  $('#mark-current-fact').addEventListener('click', () => {
    if (state.explored.has(state.currentFact)) state.explored.delete(state.currentFact); else state.explored.add(state.currentFact);
    updateReadStatus();
  });
  $('#vial-title').addEventListener('keydown', event => { if (event.key === 'ArrowRight' && state.explored.size === 3) showStage(1); });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStage(state.current + 1)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStage(state.current - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.step))));

  $('#check-mechanism').addEventListener('click', () => {
    const answer = $('input[name="insulin-effect"]:checked'); const feedback = $('#mechanism-feedback');
    if (!answer) { feedback.className = 'is-wrong'; feedback.textContent = 'Selecione uma resposta para conferir.'; return; }
    state.mechanismCorrect = answer.value === 'no';
    feedback.className = state.mechanismCorrect ? 'is-correct' : 'is-wrong';
    feedback.textContent = state.mechanismCorrect
      ? 'Correto. A insulina desloca temporariamente potássio do sangue para o interior das células. Ela não remove potássio do organismo; monitore o potássio e mantenha o plano de remoção.'
      : 'Revise o mecanismo: a insulina promove redistribuição temporária do potássio para dentro das células. A eliminação do potássio exige outras medidas.';
    $('[data-stage="1"] [data-next]').disabled = !state.mechanismCorrect;
  });
  $$('input[name="insulin-effect"]').forEach(input => input.addEventListener('change', () => {
    state.mechanismCorrect = false; $('#mechanism-feedback').textContent = ''; $('#mechanism-feedback').className = ''; $('[data-stage="1"] [data-next]').disabled = true;
  }));
  function updateCalcProgress() { $('[data-stage="2"] [data-next]').disabled = !(state.insulinCorrect && state.glucoseCorrect); }
  function checkVolume(name, expected, feedbackId, kind) {
    const selected = $(`input[name="${name}"]:checked`); const feedback = $('#' + feedbackId);
    if (!selected) { feedback.hidden = false; feedback.className = 'af-feedback'; feedback.textContent = 'Escolha uma resposta antes de conferir.'; return; }
    const correct = selected.value === expected;
    if (kind === 'insulin') state.insulinCorrect = correct; else state.glucoseCorrect = correct;
    feedback.hidden = false; feedback.className = correct ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = kind === 'insulin'
      ? (correct ? 'Correto: 10 UI ÷ 100 UI/mL = 0,1 mL. Na administração, aspire 10 UI com seringa própria graduada em unidades; não use 10 mL.' : `Revise: volume = dose ÷ concentração. 10 UI ÷ 100 UI/mL = 0,1 mL. Você marcou ${selected.value} mL. A dose clínica continua escrita em UI.`)
      : (correct ? 'Correto: glicose a 50% contém 50 g em 100 mL; metade desse volume (50 mL) fornece 25 g.' : `Revise a proporção: glicose 50% contém 50 g em 100 mL. Para 25 g, use metade do volume: 50 mL. Você marcou ${selected.value} mL.`);
    updateCalcProgress();
  }
  $('#insulin-volume-feedback').hidden = true; $('#glucose-volume-feedback').hidden = true;
  $$('input[name="insulin-volume"]').forEach(input => input.addEventListener('change', () => { state.insulinCorrect = false; $('#insulin-volume-feedback').hidden = true; updateCalcProgress(); }));
  $$('input[name="glucose-volume"]').forEach(input => input.addEventListener('change', () => { state.glucoseCorrect = false; $('#glucose-volume-feedback').hidden = true; updateCalcProgress(); }));
  // Cada cálculo tem seu próprio botão de conferência, incluído no cartão para não esconder a resposta didática.
  const volumeCards = $$('.af-insulin-calc-card');
  volumeCards.forEach((card, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'button secondary af-check-calc'; button.textContent = 'Conferir cálculo';
    button.addEventListener('click', () => index === 0
      ? checkVolume('insulin-volume', '0.1', 'insulin-volume-feedback', 'insulin')
      : checkVolume('glucose-volume', '50', 'glucose-volume-feedback', 'glucose'));
    card.append(button);
  });

  const fields = [
    ['drug', 'rx-drug', value => value === 'regular', 'Selecione insulina humana regular/solúvel.'],
    ['presentation', 'rx-presentation', value => value === 'reference', 'Use o padrão da estação: insulina humana regular 100 UI/mL em frasco-ampola de 10 mL.'],
    ['dose', 'rx-dose', value => Number(value) === 10, 'A dose de referência UKKA é 10 UI de insulina solúvel. Escreva a dose em UI, nunca em mL.'],
    ['unit', 'rx-unit', value => value === 'UI', 'Insulina deve ser prescrita em unidades internacionais (UI); não substitua a dose por volume em mL.'],
    ['route', 'rx-route', value => value === 'IV', 'Para o esquema de hipercalemia desta estação, use via intravenosa.'],
    ['time', 'rx-time', value => value === '5-15', 'A preparação do apêndice UKKA orienta administrar a infusão IV em 5–15 minutos.'],
    ['glucose', 'rx-glucose', value => value === '25g-50', 'A referência desta estação é 25 g de glicose: 50 mL da solução a 50%.']
  ];
  function reviewPrescription(event) {
    event.preventDefault(); state.submitted = true;
    const results = fields.map(([key, id, valid, explanation]) => {
      const element = $('#' + id); const result = { key, valid: valid(element.value), explanation };
      const target = $(`[data-feedback="${key}"]`);
      target.className = 'field-feedback ' + (result.valid ? 'good' : 'bad'); target.textContent = (result.valid ? 'Correto. ' : 'Revise. ') + explanation;
      target.id = 'feedback-' + key; element.setAttribute('aria-describedby', target.id); element.setAttribute('aria-invalid', String(!result.valid));
      return result;
    });
    const requiredChecks = [
      ['preparo com seringa de insulina em UI e dupla checagem', $('#rx-prep').checked],
      ['acesso calibroso, pérvio e observação do sítio', $('#rx-access').checked]
    ];
    const prepValid = requiredChecks.every(([, checked]) => checked);
    results.push({ key: 'prep', valid: prepValid, explanation: prepValid ? 'A dose e o acesso foram conferidos com as medidas de segurança indicadas.' : 'Marque: seringa de insulina graduada em UI com dupla checagem, e acesso venoso calibroso e pérvio com observação do sítio.' });
    const monitoring = [
      ['glicemia antes da dose', $('#rx-bg-baseline').checked],
      ['glicemia seriada por 6 horas', $('#rx-bg-monitor').checked],
      ['glicose adicional se glicemia inicial < 7,0 mmol/L (< 126 mg/dL)', $('#rx-bg-infusion').checked],
      ['potássio em 1, 2, 4, 6 e 24 horas', $('#rx-k-monitor').checked]
    ];
    const monitoringValid = monitoring.every(([, checked]) => checked);
    results.push({ key: 'monitoring', valid: monitoringValid, explanation: monitoringValid ? 'Glicemia inicial, monitorização seriada e reavaliações do potássio estão previstas conforme referência UKKA.' : 'Complete os cuidados: ' + monitoring.filter(([, checked]) => !checked).map(([label]) => label).join('; ') + '.' });
    results.filter(result => result.key === 'prep' || result.key === 'monitoring').forEach(result => {
      const target = $(`[data-feedback="${result.key}"]`); target.className = 'field-feedback ' + (result.valid ? 'good' : 'bad'); target.textContent = (result.valid ? 'Correto. ' : 'Revise. ') + result.explanation;
    });
    const score = results.filter(result => result.valid).length; const complete = score === results.length;
    const duration = $('#rx-time').selectedOptions[0]?.textContent || '___';
    const glucose = $('#rx-glucose').selectedOptions[0]?.textContent || 'glicose não selecionada';
    const prep = $('#rx-prep').checked ? 'aspirar 10 UI com seringa de insulina graduada em UI e dupla checagem independente' : 'preparo a revisar';
    const extra = $('#rx-bg-infusion').checked ? 'se glicemia inicial < 7,0 mmol/L (< 126 mg/dL), glicose 10% IV a 50 mL/h por 5 h' : 'proteção adicional condicionada à glicemia inicial não registrada';
    $('#assembled-rx').textContent = `Insulina humana regular/solúvel 10 UI, 100 UI/mL, frasco-ampola de 10 mL, via IV, associada a ${glucose}, infundir em ${duration}. Preparo: ${prep}. Segurança: acesso venoso calibroso e pérvio, observar o local. ${extra}. Monitorizar glicemia antes e aos 30, 60, 90, 120, 180, 240, 300 e 360 min; reavaliar potássio em 1, 2, 4, 6 e 24 h.`;
    $('#result-score').textContent = `${score} de ${results.length} campos corretos`;
    $('#result-title').textContent = complete ? 'Prescrição completa para esta referência.' : 'Confira os campos que precisam de ajuste.';
    $('#field-review').innerHTML = results.map(result => `<li class="${result.valid ? 'good' : 'bad'}"><strong>${result.valid ? 'Adequado' : 'Ajustar'}:</strong> ${escapeHTML(result.explanation)}</li>`).join('');
    $('#prescription-result').hidden = false;
    $('#rx-form-status').textContent = complete ? 'Você incluiu os itens essenciais desta prática.' : 'A ordem está montada para revisão. Use o feedback por campo e envie novamente após os ajustes.';
    if (complete) { $('#progress-bar').setAttribute('aria-valuenow', '100'); $('#progress-fill').style.width = '100%'; $('#progress-detail').textContent = 'Estação concluída'; $('#progress-label').textContent = 'Etapa 4 de 4 · concluída'; }
    $('#prescription-result').scrollIntoView({ behavior: 'smooth', block: 'start' }); if (complete) $('#result-title').focus?.();
  }
  function escapeHTML(text) { return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  $('#prescription-form').addEventListener('submit', reviewPrescription);
  updateProgress(); updateReadStatus(); $('[data-stage="1"] [data-next]').disabled = true; updateCalcProgress();
})();
