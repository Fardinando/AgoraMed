(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const stages = $$('.af-stage');
  const stepButtons = $$('.af-step-nav button');
  const stageNames = ['Explorar a apresentação', 'Entender a ação', 'Fazer a conversão', 'Montar a prescrição'];
  const facts = {
    strength: { label: 'DADO DA APRESENTAÇÃO', title: 'Conteúdo do sachê', value: '5 g', description: 'Cada sachê da apresentação de referência contém 5 g de ciclossilicato de zircônio sódico.', extra: 'A dose aguda de 10 g equivale a dois sachês de 5 g.' },
    form: { label: 'FORMA FARMACÊUTICA', title: 'Pó para suspensão oral', value: 'Uso oral', description: 'O conteúdo do sachê deve ser misturado em água e tomado pela boca.', extra: 'O pó não se dissolve. Mexa antes de ingerir para manter o medicamento suspenso na água.' },
    preparation: { label: 'PREPARO · REFERÊNCIA DA CONITEC', title: 'Misture e tome sem esperar', value: '≈ 45 mL de água', description: 'A orientação documentada é usar aproximadamente 45 mL de água, mexer e beber logo após preparar.', extra: 'Como o pó permanece suspenso, tome imediatamente enquanto a mistura ainda estiver homogênea.' }
  };
  const state = { current: 0, currentFact: 'strength', explored: new Set(), mechanismCorrect: false, conversionCorrect: false };

  function updateProgress() {
    const percent = Math.round(((state.current + 1) / stages.length) * 100);
    $('#progress-bar').setAttribute('aria-valuenow', String(percent));
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
    if (index === 3) return state.conversionCorrect;
    return false;
  }
  function showStage(index) {
    if (index < 0 || index >= stages.length || !canEnter(index)) return;
    state.current = index;
    stages.forEach((stage, i) => { stage.hidden = i !== index; });
    updateProgress();
    $('#stage-announcement').textContent = `Etapa ${index + 1} de 4: ${stageNames[index]}.`;
    const heading = $(`[data-stage="${index}"] h2`);
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const answer = $('input[name="szc-role"]:checked');
    const feedback = $('#mechanism-feedback');
    if (!answer) {
      feedback.className = 'is-wrong';
      feedback.textContent = 'Selecione uma resposta antes de conferir.';
      return;
    }
    state.mechanismCorrect = answer.value === 'adjunct';
    feedback.className = state.mechanismCorrect ? 'is-correct' : 'is-wrong';
    feedback.textContent = state.mechanismCorrect
      ? 'Correto. A UKKA recomenda o ciclossilicato como medida de remoção na hipercalemia aguda grave e sugere considerar na moderada. Ele não estabiliza o miocárdio nem substitui insulina/glicose, cálcio quando indicado, ECG, dosagens seriadas ou outras medidas necessárias.'
      : 'Revise o mecanismo: o ciclossilicato remove potássio pelo trato gastrointestinal. Ele não protege imediatamente o coração nem substitui as medidas padrão da emergência.';
    $('[data-stage="1"] [data-next]').disabled = !state.mechanismCorrect;
  });
  $$('input[name="szc-role"]').forEach(input => input.addEventListener('change', () => {
    state.mechanismCorrect = false;
    $('#mechanism-feedback').textContent = '';
    $('#mechanism-feedback').className = '';
    $('[data-stage="1"] [data-next]').disabled = true;
  }));

  $('#check-volume').addEventListener('click', () => {
    const answer = $('input[name="szc-sachets"]:checked');
    const feedback = $('#volume-feedback');
    feedback.hidden = false;
    if (!answer) {
      state.conversionCorrect = false;
      feedback.className = 'af-feedback';
      feedback.textContent = 'Escolha uma resposta antes de conferir.';
      return;
    }
    state.conversionCorrect = answer.value === '2';
    feedback.className = state.conversionCorrect ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.conversionCorrect
      ? 'Cálculo correto: 10 g ÷ 5 g por sachê = 2 sachês por administração. Como a fase de correção é três vezes ao dia, isso corresponde a 6 sachês por dia, por até 72 horas conforme a UKKA.'
      : 'Recalcule: 10 g ÷ 5 g por sachê = 2 sachês por administração. A frequência da fase aguda é três vezes ao dia.';
    $('[data-stage="2"] [data-next]').disabled = !state.conversionCorrect;
  });
  $$('input[name="szc-sachets"]').forEach(input => input.addEventListener('change', () => {
    state.conversionCorrect = false;
    $('#volume-feedback').hidden = true;
    $('[data-stage="2"] [data-next]').disabled = true;
  }));

  $('#prescription-form').addEventListener('submit', event => {
    event.preventDefault();
    const dose = Number($('#rx-dose').value);
    const expectedSachets = dose / 5;
    const checks = [
      ['drug', 'rx-drug', value => value === 'szc', 'Selecione ciclossilicato de zircônio sódico.'],
      ['presentation', 'rx-presentation', value => value === '5g', 'Selecione o pó para suspensão oral em sachês de 5 g.'],
      ['dose', 'rx-dose', value => value === '10', 'Nesta prática de hipercalemia grave, use a dose de correção UKKA de 10 g por administração.'],
      ['sachets', 'rx-sachets', value => Number(value) === 2 && dose === 10, 'Cada sachê contém 5 g; 10 g correspondem a 2 sachês por administração.'],
      ['route', 'rx-route', value => value === 'oral', 'A apresentação em pó para suspensão é administrada por via oral.'],
      ['frequency', 'rx-frequency', value => value === 'tid', 'A referência UKKA para correção aguda é 10 g três vezes ao dia.'],
      ['duration', 'rx-duration', value => value === '24-48' || value === '72', 'A correção costuma durar 24–48 horas e pode seguir até 72 horas no máximo; se persistir hipercalemia, reavalie a estratégia.']
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
    const prepOk = $('#rx-prep').checked && $('#rx-adjunct').checked && $('#rx-separation').checked;
    const prepExplanation = prepOk
      ? 'A suspensão foi preparada para ingestão imediata, o papel adjuvante foi identificado e as interações orais foram consideradas.'
      : 'Registre o preparo com água e ingestão imediata, use como medida adjuvante e avalie intervalo com medicamentos orais sensíveis ao pH.';
    results.push({ key: 'prep', valid: prepOk, explanation: prepExplanation });
    const monitoringOk = $('#rx-potassium').checked && $('#rx-volume').checked;
    const monitoringExplanation = monitoringOk
      ? 'O plano inclui dosagens seriadas de potássio e vigilância de tolerância e estado volêmico.'
      : 'Inclua reavaliações seriadas de potássio e monitore edema/volume, constipação e hipocalemia.';
    results.push({ key: 'monitoring', valid: monitoringOk, explanation: monitoringExplanation });
    for (const item of results.filter(item => item.key === 'prep' || item.key === 'monitoring')) {
      const target = $(`[data-feedback="${item.key}"]`);
      target.className = 'field-feedback ' + (item.valid ? 'good' : 'bad');
      target.textContent = (item.valid ? 'Adequado. ' : 'Revise. ') + item.explanation;
    }
    const score = results.filter(item => item.valid).length;
    const complete = score === results.length;
    const durationText = $('#rx-duration').selectedOptions[0]?.textContent || 'duração a definir';
    $('#assembled-rx').textContent = `Ciclossilicato de zircônio sódico, pó para suspensão oral 5 g/sachê: ${dose || 'dose não selecionada'} g (${Number.isFinite(expectedSachets) ? expectedSachets : 'quantidade a calcular'} sachês) por via oral, 3 vezes ao dia, ${durationText}. Para cada dose, dispersar os 2 sachês em aproximadamente 45 mL de água, mexer e ingerir imediatamente enquanto o pó estiver suspenso. Medida de remoção associada ao manejo completo; monitorar potássio, tolerância gastrointestinal e estado volêmico.`;
    $('#result-score').textContent = `${score} de ${results.length} campos adequados`;
    $('#result-title').textContent = complete ? 'Ordem completa para o cenário didático.' : 'Confira os campos que precisam de ajuste.';
    $('#field-review').innerHTML = results.map(item => `<li class="${item.valid ? 'good' : 'bad'}"><strong>${item.valid ? 'Adequado' : 'Ajustar'}:</strong> ${escapeHTML(item.explanation)}</li>`).join('');
    $('#prescription-result').hidden = false;
    $('#rx-form-status').textContent = complete ? 'Você incluiu os itens essenciais desta prática.' : 'A ordem foi montada para revisão. Use o feedback por campo e confira novamente.';
    if (complete) {
      $('#progress-bar').setAttribute('aria-valuenow', '100');
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
  showFact('strength');
  $('[data-stage="1"] [data-next]').disabled = true;
  $('[data-stage="2"] [data-next]').disabled = true;
})();
