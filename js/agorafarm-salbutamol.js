(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const stages = $$('.af-stage');
  const stepButtons = $$('.af-step-nav button');
  const stageNames = ['Explorar apresentações', 'Entender a ação', 'Fazer as conversões', 'Montar a prescrição'];
  const facts = {
    inhaler: { label: 'DADO DO RÓTULO', title: 'Aerossol dosimetrado', value: '100 mcg por jato', description: 'Cada acionamento libera nominalmente 100 microgramas de salbutamol.', extra: '100 mcg correspondem a 0,1 mg. Em massa nominal, 10 mg equivalem a 100 jatos; isso não significa equivalência clínica nem recomenda centenas de jatos.' },
    nebulized: { label: 'DADO DO RÓTULO', title: 'Solução para inalação', value: '5 mg/mL', description: 'Cada mililitro contém 5 mg de salbutamol para uso inalatório conforme a apresentação e instruções do produto.', extra: '10 mg correspondem a 2 mL; 20 mg correspondem a 4 mL. Volume final e eventual diluição devem seguir a bula e o protocolo local.' },
    dose: { label: 'REFERÊNCIA UKKA 2026', title: 'Dose na hipercalemia', value: '10–20 mg nebulizados', description: 'A UKKA recomenda salbutamol nebulizado como adjuvante na hipercalemia grave e sugere seu uso na moderada.', extra: 'Na solução de 5 mg/mL, 10 mg = 2 mL e 20 mg = 4 mL. A escolha dentro da faixa depende do quadro clínico e do protocolo.' },
    route: { label: 'VIA E FINALIDADE', title: 'Nebulização como adjuvante', value: 'Não usar como monoterapia na forma grave', description: 'Para hipercalemia, a referência UKKA descreve a via nebulizada; o salbutamol desloca potássio temporariamente para dentro das células.', extra: 'A “bombinha” de 100 mcg/jato é comum, mas a equivalência de massa com 100–200 jatos não torna essa via equivalente ou prática para a dose de emergência.' }
  };
  const state = { current: 0, currentFact: 'inhaler', explored: new Set(), mechanismCorrect: false, puffsCorrect: false, nebCorrect: false, submitted: false };
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
    if (index === 1) return state.explored.size === Object.keys(facts).length;
    if (index === 2) return state.mechanismCorrect;
    if (index === 3) return state.puffsCorrect && state.nebCorrect;
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
    $('#read-status').textContent = `${count} de ${Object.keys(facts).length} dados vistos`;
    $$('.af-fact-check').forEach(check => { check.hidden = !state.explored.has(check.dataset.factCheck); });
    const seen = state.explored.has(state.currentFact);
    const markButton = $('#mark-current-fact');
    markButton.setAttribute('aria-pressed', String(seen));
    markButton.textContent = seen ? 'Visto ✓ · marcar novamente' : 'Marcar este dado como visto';
    $('[data-stage="0"] [data-next]').disabled = count !== Object.keys(facts).length;
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
  $('#salbutamol-label-title').addEventListener('keydown', event => { if (event.key === 'ArrowRight' && state.explored.size === Object.keys(facts).length) showStage(1); });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStage(state.current + 1)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStage(state.current - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.step))));

  $('#check-mechanism').addEventListener('click', () => {
    const answer = $('input[name="salbutamol-role"]:checked'); const feedback = $('#mechanism-feedback');
    if (!answer) { feedback.className = 'is-wrong'; feedback.textContent = 'Selecione uma resposta para conferir.'; return; }
    state.mechanismCorrect = answer.value === 'shift';
    feedback.className = state.mechanismCorrect ? 'is-correct' : 'is-wrong';
    feedback.textContent = state.mechanismCorrect
      ? 'Correto. O salbutamol favorece o deslocamento temporário do potássio para dentro das células; não o remove do corpo. Por isso é adjuvante, nunca monoterapia na hipercalemia grave.'
      : 'Revise o mecanismo: o salbutamol promove redistribuição temporária do potássio e não substitui as medidas que removem potássio do organismo.';
    $('[data-stage="1"] [data-next]').disabled = !state.mechanismCorrect;
  });
  $$('input[name="salbutamol-role"]').forEach(input => input.addEventListener('change', () => {
    state.mechanismCorrect = false; $('#mechanism-feedback').textContent = ''; $('#mechanism-feedback').className = ''; $('[data-stage="1"] [data-next]').disabled = true;
  }));

  function checkPuffs() {
    const selected = $('input[name="puff-count"]:checked'); const feedback = $('#puff-feedback');
    if (!selected) { feedback.hidden = false; feedback.className = 'af-feedback'; feedback.textContent = 'Escolha uma resposta antes de conferir.'; return; }
    state.puffsCorrect = selected.value === '100';
    feedback.hidden = false; feedback.className = state.puffsCorrect ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.puffsCorrect
      ? 'Cálculo correto: 10 mg = 10.000 mcg; 10.000 ÷ 100 mcg/jato = 100 jatos. Isso é apenas equivalência nominal de massa. A dose UKKA para hipercalemia é nebulizada; não prescreva 100 jatos como substituto.'
      : `Revise: 10 mg = 10.000 mcg; dividindo por 100 mcg em cada jato, são 100 jatos por equivalência de massa. Você marcou ${selected.value} jatos. A bombinha não é a via de referência para essa dose de emergência.`;
    updateCalculationProgress();
  }
  function checkNebVolume() {
    const selected = $('input[name="neb-volume"]:checked'); const feedback = $('#neb-feedback');
    if (!selected) { feedback.hidden = false; feedback.className = 'af-feedback'; feedback.textContent = 'Escolha um volume antes de conferir.'; return; }
    state.nebCorrect = selected.value === '4';
    feedback.hidden = false; feedback.className = state.nebCorrect ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.nebCorrect
      ? 'Correto: 20 mg ÷ 5 mg/mL = 4 mL de solução. Esse é o volume do medicamento; eventual diluição e volume final dependem da bula e do protocolo local.'
      : `Revise: 20 mg ÷ 5 mg/mL = 4 mL. Você escolheu ${selected.value} mL. Confirme o preparo final conforme o produto e o nebulizador.`;
    updateCalculationProgress();
  }
  function updateCalculationProgress() { $('[data-stage="2"] [data-next]').disabled = !(state.puffsCorrect && state.nebCorrect); }
  $('#check-puffs').addEventListener('click', checkPuffs);
  $('#check-neb').addEventListener('click', checkNebVolume);
  $$('input[name="puff-count"]').forEach(input => input.addEventListener('change', () => { state.puffsCorrect = false; $('#puff-feedback').hidden = true; updateCalculationProgress(); }));
  $$('input[name="neb-volume"]').forEach(input => input.addEventListener('change', () => { state.nebCorrect = false; $('#neb-feedback').hidden = true; updateCalculationProgress(); }));

  function reviewPrescription(event) {
    event.preventDefault(); state.submitted = true;
    const dose = Number($('#rx-dose').value);
    const expectedVolume = dose === 10 ? 2 : dose === 20 ? 4 : NaN;
    const fields = [
      ['drug', 'rx-drug', value => value === 'salbutamol', 'Selecione sulfato de salbutamol.'],
      ['presentation', 'rx-presentation', value => value === 'neb', 'Para esta ordem, selecione solução para inalação 5 mg/mL, a apresentação usada na nebulização de referência.'],
      ['dose', 'rx-dose', value => value === '10' || value === '20', 'A faixa UKKA é 10–20 mg nebulizados como adjuvante; use a dose compatível com o contexto e protocolo.'],
      ['volume', 'rx-volume', value => Number(value) === expectedVolume, `Com solução a 5 mg/mL, ${dose || '10 ou 20'} mg correspondem a ${Number.isFinite(expectedVolume) ? expectedVolume : '2 ou 4'} mL.`],
      ['route', 'rx-route', value => value === 'nebulization', 'A referência UKKA para hipercalemia é administração por nebulização; a equivalência em jatos não é intercambiabilidade clínica.'],
      ['frequency', 'rx-frequency', value => value === 'once', 'Registre uma dose nesta simulação. Repetição depende de reavaliação clínica e protocolo.' ]
    ];
    const results = fields.map(([key, id, valid, explanation]) => {
      const element = $('#' + id); const result = { key, valid: valid(element.value), explanation };
      const target = $(`[data-feedback="${key}"]`);
      target.className = 'field-feedback ' + (result.valid ? 'good' : 'bad'); target.textContent = (result.valid ? 'Correto. ' : 'Revise. ') + explanation;
      target.id = 'feedback-' + key; element.setAttribute('aria-describedby', target.id); element.setAttribute('aria-invalid', String(!result.valid));
      return result;
    });
    const preparation = [
      ['volume do medicamento conferido', $('#rx-prep').checked],
      ['volume final/diluição conferido na bula e protocolo', $('#rx-dilution').checked],
      ['salbutamol registrado como adjuvante, sem monoterapia', $('#rx-adjunct').checked]
    ];
    const preparationValid = preparation.every(([, checked]) => checked);
    results.push({ key: 'prep', valid: preparationValid, explanation: preparationValid ? 'Volume, preparo e papel adjuvante foram revisados.' : 'Confira o volume de 2 ou 4 mL, confirme preparo/diluição na bula local e registre o salbutamol como adjuvante.' });
    const monitoring = [
      ['monitorização cardíaca e efeitos beta-adrenérgicos', $('#rx-cardiac').checked],
      ['reavaliação seriada do potássio e vigilância de rebote', $('#rx-potassium').checked]
    ];
    const monitoringValid = monitoring.every(([, checked]) => checked);
    results.push({ key: 'monitoring', valid: monitoringValid, explanation: monitoringValid ? 'ECG/efeitos adversos e potássio serão reavaliados.' : 'Complete a monitorização: ECG contínuo em hipercalemia grave, frequência cardíaca e efeitos adversos; potássio em 1, 2, 4, 6 e 24 h.' });
    results.filter(result => result.key === 'prep' || result.key === 'monitoring').forEach(result => {
      const target = $(`[data-feedback="${result.key}"]`); target.className = 'field-feedback ' + (result.valid ? 'good' : 'bad'); target.textContent = (result.valid ? 'Correto. ' : 'Revise. ') + result.explanation;
    });
    const score = results.filter(result => result.valid).length; const complete = score === results.length;
    const volume = Number.isFinite(expectedVolume) ? expectedVolume : 'a calcular';
    const doseDescription = $('#rx-dose').selectedOptions[0]?.textContent || 'dose não selecionada';
    $('#assembled-rx').textContent = `Sulfato de salbutamol, solução para inalação 5 mg/mL: ${doseDescription} (${volume} mL), via inalatória por nebulização, dose única nesta simulação, como adjuvante no tratamento da hipercalemia grave. Definir eventual diluição/volume final conforme bula do produto e protocolo local. Manter ECG contínuo e observar frequência cardíaca, palpitações e tremor; reavaliar potássio em 1, 2, 4, 6 e 24 h e seguir plano de remoção do potássio. Equivalência apenas nominal: a bombinha 100 mcg/jato corresponderia a ${dose === 10 ? 100 : dose === 20 ? 200 : '100–200'} jatos, mas não substitui a nebulização recomendada.`;
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
  updateProgress(); updateReadStatus(); $('[data-stage="1"] [data-next]').disabled = true; updateCalculationProgress();
})();
