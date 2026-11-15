(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const stages = $$('.af-stage');
  const stepButtons = $$('.af-step-nav button');
  const stageNames = ['Explorar apresentações', 'Entender a indicação', 'Fazer a conversão', 'Montar a prescrição'];
  const facts = {
    tablet: { label: 'RENAME 2024', title: 'Comprimido', value: '40 mg', description: 'A RENAME 2024 contempla furosemida 40 mg em comprimido no componente básico.', extra: '40 mg descrevem a quantidade de furosemida em cada comprimido. Não confunda esta forma oral com a concentração da solução injetável.' },
    concentration: { label: 'DADO DA APRESENTAÇÃO', title: 'Solução injetável', value: '10 mg/mL', description: 'Cada mililitro da solução injetável de referência contém 10 mg de furosemida.', extra: 'Para calcular volume: dose em mg ÷ concentração em mg/mL = volume em mL. A apresentação consta na RENAME 2024.' },
    ampoule: { label: 'AMPOLA ILUSTRATIVA', title: 'Volume de referência', value: '2 mL · 20 mg', description: 'A ilustração usa uma ampola de 2 mL a 10 mg/mL, que contém 20 mg no total.', extra: 'O volume por ampola pode variar. Confira o rótulo e recalcule se o produto disponível tiver volume diferente.' }
  };
  const state = { current: 0, currentFact: 'tablet', explored: new Set(), mechanismCorrect: false, volumeCorrect: false };
  const progress = $('#progress-bar');
  function updateProgress() {
    const percent = Math.round(((state.current + 1) / stages.length) * 100);
    progress.setAttribute('aria-valuenow', String(percent)); $('#progress-fill').style.width = percent + '%';
    $('#progress-label').textContent = `Etapa ${state.current + 1} de ${stages.length}`; $('#progress-detail').textContent = stageNames[state.current];
    stepButtons.forEach((button, index) => { if (index === state.current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); button.classList.toggle('is-done', index < state.current); });
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
    state.current = index; stages.forEach((stage, i) => { stage.hidden = i !== index; }); updateProgress();
    $('#stage-announcement').textContent = `Etapa ${index + 1} de 4: ${stageNames[index]}.`;
    if (focusHeading) { const heading = $('[data-stage="' + index + '"] h2'); heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); heading.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  function updateReadStatus() {
    $('#read-status').textContent = `${state.explored.size} de ${Object.keys(facts).length} dados vistos`;
    $$('.af-fact-check').forEach(check => { check.hidden = !state.explored.has(check.dataset.factCheck); });
    const button = $('#mark-current-fact'); const seen = state.explored.has(state.currentFact);
    button.setAttribute('aria-pressed', String(seen)); button.textContent = seen ? 'Visto ✓ · marcar novamente' : 'Marcar este dado como visto';
    $('[data-stage="0"] [data-next]').disabled = state.explored.size !== Object.keys(facts).length;
  }
  function showFact(key) {
    const fact = facts[key]; if (!fact) return; state.currentFact = key;
    $$('.af-fact-select').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fact === key)));
    $('#fact-label').textContent = fact.label; $('#fact-title').textContent = fact.title; $('#fact-value').textContent = fact.value;
    $('#fact-description').textContent = fact.description; $('.af-fact-extra span').textContent = fact.extra; updateReadStatus();
  }
  $$('.af-fact-select').forEach(button => button.addEventListener('click', () => showFact(button.dataset.fact)));
  $('#mark-current-fact').addEventListener('click', () => { if (state.explored.has(state.currentFact)) state.explored.delete(state.currentFact); else state.explored.add(state.currentFact); updateReadStatus(); });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStage(state.current + 1)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStage(state.current - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.step))));
  $('#check-mechanism').addEventListener('click', () => {
    const answer = $('input[name="furo-role"]:checked'); const feedback = $('#mechanism-feedback');
    if (!answer) { feedback.className = 'is-wrong'; feedback.textContent = 'Selecione uma resposta para conferir.'; return; }
    state.mechanismCorrect = answer.value === 'candidate'; feedback.className = state.mechanismCorrect ? 'is-correct' : 'is-wrong';
    feedback.textContent = state.mechanismCorrect
      ? 'Correto. A UKKA sugere diurético de alça como adjuvante na hipercalemia crônica em pacientes sem oligúria e com volume adequado. Congestão pode fornecer uma indicação adicional para diurese, mas a dose é individualizada e a furosemida não substitui o manejo urgente da hipercalemia grave.'
      : 'Revise a seleção: a UKKA orienta evitar diuréticos em hipovolemia ou oligúria. Considere a furosemida apenas quando houver indicação clínica, diurese e condição volêmica compatível.';
    $('[data-stage="1"] [data-next]').disabled = !state.mechanismCorrect;
  });
  $$('input[name="furo-role"]').forEach(input => input.addEventListener('change', () => { state.mechanismCorrect = false; $('#mechanism-feedback').textContent = ''; $('#mechanism-feedback').className = ''; $('[data-stage="1"] [data-next]').disabled = true; }));
  $('#check-volume').addEventListener('click', () => {
    const answer = $('input[name="furo-volume"]:checked'); const feedback = $('#volume-feedback'); feedback.hidden = false;
    if (!answer) { feedback.className = 'af-feedback'; feedback.textContent = 'Escolha uma resposta antes de conferir.'; return; }
    state.volumeCorrect = answer.value === '4'; feedback.className = state.volumeCorrect ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.volumeCorrect
      ? 'Cálculo correto: 40 mg ÷ 10 mg/mL = 4 mL. Se a ampola disponível tiver 2 mL, serão necessárias 2 ampolas. O volume real da ampola deve ser conferido no rótulo.'
      : `Recalcule: 40 mg ÷ 10 mg/mL = 4 mL. Você escolheu ${answer.value} mL. A quantidade de ampolas também depende do volume indicado no rótulo.`;
    $('[data-stage="2"] [data-next]').disabled = !state.volumeCorrect;
  });
  $$('input[name="furo-volume"]').forEach(input => input.addEventListener('change', () => { state.volumeCorrect = false; $('#volume-feedback').hidden = true; $('[data-stage="2"] [data-next]').disabled = true; }));

  $('#prescription-form').addEventListener('submit', event => {
    event.preventDefault();
    const dose = Number($('#rx-dose').value); const expectedVolume = dose / 10;
    const checks = [
      ['drug', 'rx-drug', value => value === 'furosemide', 'Selecione furosemida.'],
      ['presentation', 'rx-presentation', value => value === 'injectable', 'Para esta ordem IV, selecione solução injetável 10 mg/mL.'],
      ['dose', 'rx-dose', value => value === '40', 'Nesta simulação, use 40 mg. Essa é uma dose do cenário didático, não uma dose de hipercalemia definida pela UKKA.'],
      ['volume', 'rx-volume', value => Number(value) === expectedVolume && dose === 40, 'Com concentração de 10 mg/mL, 40 mg correspondem a 4 mL.'],
      ['route', 'rx-route', value => value === 'iv', 'Selecione via intravenosa para esta ordem simulada.'],
      ['time', 'rx-time', value => value === '10' || value === '20', 'Registre administração lenta. Para 40 mg, 10 min = 4 mg/min e 20 min = 2 mg/min; em insuficiência renal grave, siga o limite menor da bula disponível.']
    ];
    const results = checks.map(([key, id, valid, explanation]) => {
      const input = $('#' + id); const ok = valid(input.value); const target = $(`[data-feedback="${key}"]`);
      target.className = 'field-feedback ' + (ok ? 'good' : 'bad'); target.textContent = (ok ? 'Adequado. ' : 'Revise. ') + explanation;
      target.id = 'feedback-' + key; input.setAttribute('aria-describedby', target.id); input.setAttribute('aria-invalid', String(!ok)); return { key, valid: ok, explanation };
    });
    const prepOk = $('#rx-indication').checked && $('#rx-concentration').checked && $('#rx-rate').checked;
    const prepExplanation = prepOk ? 'Indicação, concentração e velocidade foram conferidas.' : 'Registre a indicação (congestão com diurese), confira 10 mg/mL e escolha um tempo de administração lenta que respeite a velocidade máxima da bula.';
    results.push({ key: 'prep', valid: prepOk, explanation: prepExplanation });
    const monitoringOk = $('#rx-vitals').checked && $('#rx-labs').checked;
    const monitoringExplanation = monitoringOk ? 'Sinais vitais, diurese, eletrólitos e função renal serão reavaliados.' : 'Inclua pressão, diurese, balanço hídrico, eletrólitos e função renal no plano de monitorização.';
    results.push({ key: 'monitoring', valid: monitoringOk, explanation: monitoringExplanation });
    for (const item of results.filter(item => item.key === 'prep' || item.key === 'monitoring')) { const target = $(`[data-feedback="${item.key}"]`); target.className = 'field-feedback ' + (item.valid ? 'good' : 'bad'); target.textContent = (item.valid ? 'Adequado. ' : 'Revise. ') + item.explanation; }
    const score = results.filter(item => item.valid).length; const complete = score === results.length;
    const time = Number($('#rx-time').value); const rate = time && dose ? (dose / time).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 'a calcular';
    $('#assembled-rx').textContent = `Furosemida solução injetável 10 mg/mL: ${Number.isFinite(dose) ? dose : 'dose não selecionada'} mg (${Number.isFinite(expectedVolume) ? expectedVolume : 'volume a calcular'} mL), via intravenosa, administrar em ${time || 'tempo a definir'} minutos nesta simulação (velocidade ${rate} mg/min). Indicação do exercício: congestão/hipervolemia com diurese presente. Monitorar pressão arterial, diurese e balanço hídrico; reavaliar potássio, sódio, magnésio e função renal. A UKKA não define esta dose como esquema de tratamento da hipercalemia.`;
    $('#result-score').textContent = `${score} de ${results.length} campos adequados`; $('#result-title').textContent = complete ? 'Ordem completa para o cenário didático.' : 'Confira os campos que precisam de ajuste.';
    $('#field-review').innerHTML = results.map(item => `<li class="${item.valid ? 'good' : 'bad'}"><strong>${item.valid ? 'Adequado' : 'Ajustar'}:</strong> ${escapeHTML(item.explanation)}</li>`).join('');
    $('#prescription-result').hidden = false; $('#rx-form-status').textContent = complete ? 'Você incluiu os itens essenciais desta prática.' : 'A ordem foi montada para revisão. Use o feedback por campo e confira novamente.';
    if (complete) { progress.setAttribute('aria-valuenow', '100'); $('#progress-fill').style.width = '100%'; $('#progress-detail').textContent = 'Estação concluída'; $('#progress-label').textContent = 'Etapa 4 de 4 · concluída'; }
    $('#prescription-result').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#result-title').focus({ preventScroll: true });
  });
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  updateProgress(); showFact('tablet'); $('[data-stage="1"] [data-next]').disabled = true; $('[data-stage="2"] [data-next]').disabled = true;
})();
