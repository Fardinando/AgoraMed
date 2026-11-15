(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const stages = $$('.af-stage');
  const stepButtons = $$('.af-step-nav button');
  const stageNames = ['Explorar apresentações', 'Entender o papel', 'Fazer as conversões', 'Montar a prescrição'];
  const facts = {
    d50concentration: { label: 'DADO DO RÓTULO', title: 'Concentração de glicose 50%', value: '50% · 500 mg/mL', description: 'Cada mililitro contém 500 mg, ou 0,5 g, de glicose anidra.', extra: '50% m/v significa 50 g em 100 mL. Para fornecer 25 g, calcule 50 mL da solução.' },
    volume: { label: 'DADO DO RÓTULO', title: 'Volume da ampola de referência', value: '10 mL', description: 'A apresentação padronizada para este cálculo didático é uma ampola de glicose 50% com 10 mL.', extra: 'Cada ampola de 10 mL fornece 5 g de glicose a 50%. Cinco ampolas totalizam 50 mL, equivalentes a 25 g.' },
    d10concentration: { label: 'DADO DO RÓTULO', title: 'Concentração de glicose 10%', value: '10% · 100 mg/mL', description: 'Cada mililitro contém 100 mg, ou 0,1 g, de glicose anidra.', extra: 'A infusão de referência é 50 mL por hora durante 5 horas: 250 mL no total, equivalentes a 25 g.' },
    form: { label: 'FORMA E VIA', title: 'Solução injetável intravenosa', value: 'IV · dose inicial e infusão', description: 'A glicose 50% é usada como dose concentrada inicial; as soluções 10% ou 5% podem ser consideradas para a infusão complementar conforme glicemia, protocolo e estado volêmico.', extra: 'A glicose 50% é concentrada e requer atenção ao acesso venoso. A infusão complementar de 5% fornece a mesma carga em volume maior que a de 10%.' },
    d5concentration: { label: 'DADO DO RÓTULO', title: 'Concentração do soro glicosado 5%', value: '5% · 50 mg/mL', description: 'Cada mililitro contém 50 mg, ou 0,05 g, de glicose anidra.', extra: 'Para fornecer 25 g em 5 horas: 25 g ÷ 0,05 g/mL = 500 mL; 500 mL ÷ 5 h = 100 mL/h. É o dobro do volume da glicose 10%.' }
  };
  const state = { current: 0, currentFact: 'd50concentration', explored: new Set(), mechanismCorrect: false, d50Correct: false, sg5Correct: false, submitted: false };
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
    if (index === 3) return state.d50Correct && state.sg5Correct;
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
    $('#ampoule-read-status').textContent = `${count} de ${Object.keys(facts).length} dados vistos`;
    $$('.af-fact-check').forEach(check => { check.hidden = !state.explored.has(check.dataset.factCheck); });
    const button = $('#mark-current-fact');
    button.setAttribute('aria-pressed', String(currentSeen));
    button.textContent = currentSeen ? 'Visto ✓ · marcar novamente' : 'Marcar este dado como visto';
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
  $('#glucose-label-title').addEventListener('keydown', event => { if (event.key === 'ArrowRight' && state.explored.size === Object.keys(facts).length) showStage(1); });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStage(state.current + 1)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStage(state.current - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.step))));

  $('#check-mechanism').addEventListener('click', () => {
    const answer = $('input[name="glucose-role"]:checked'); const feedback = $('#mechanism-feedback');
    if (!answer) { feedback.className = 'is-wrong'; feedback.textContent = 'Selecione uma resposta para conferir.'; return; }
    state.mechanismCorrect = answer.value === 'hypoglycemia';
    feedback.className = state.mechanismCorrect ? 'is-correct' : 'is-wrong';
    feedback.textContent = state.mechanismCorrect
      ? 'Correto. A insulina desloca o potássio para dentro das células; a glicose é associada para reduzir o risco de hipoglicemia. Se a glicemia inicial for menor que 126 mg/dL (7,0 mmol/L), acrescente a infusão de glicose 10% indicada pela UKKA.'
      : 'Revise o papel de cada medicamento: a insulina promove a redistribuição do potássio. A glicose acompanha a insulina para reduzir o risco de hipoglicemia e não substitui a monitorização.';
    $('[data-stage="1"] [data-next]').disabled = !state.mechanismCorrect;
  });
  $$('input[name="glucose-role"]').forEach(input => input.addEventListener('change', () => {
    state.mechanismCorrect = false; $('#mechanism-feedback').textContent = ''; $('#mechanism-feedback').className = ''; $('[data-stage="1"] [data-next]').disabled = true;
  }));

  function checkD50() {
    const volume = $('input[name="d50-volume"]:checked'); const count = $('input[name="d50-ampoules"]:checked'); const feedback = $('#d50-feedback');
    if (!volume || !count) { feedback.hidden = false; feedback.className = 'af-feedback'; feedback.textContent = 'Responda o volume total e o número de ampolas antes de conferir.'; return; }
    state.d50Correct = volume.value === '50' && count.value === '5';
    feedback.hidden = false; feedback.className = state.d50Correct ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.d50Correct
      ? 'Correto: 25 g ÷ 0,5 g/mL = 50 mL. Com ampolas de 10 mL, são cinco ampolas. A dose continua sendo escrita em gramas e o volume deve ser conferido.'
      : `Revise a conversão: glicose 50% contém 0,5 g/mL. Para 25 g são 50 mL; com ampolas de 10 mL, cinco ampolas. Você escolheu ${volume.value} mL e ${count.value} ampolas.`;
    updateCalcProgress();
  }
  function checkSg5Equivalent() {
    const selected = $('input[name="sg5-rate"]:checked'); const feedback = $('#sg5-feedback');
    if (!selected) { feedback.hidden = false; feedback.className = 'af-feedback'; feedback.textContent = 'Escolha uma resposta antes de conferir.'; return; }
    state.sg5Correct = selected.value === '100';
    feedback.hidden = false; feedback.className = state.sg5Correct ? 'af-feedback correct' : 'af-feedback';
    feedback.textContent = state.sg5Correct
      ? 'Correto: SG 5% contém 0,05 g/mL. Para 25 g, são 500 mL; em 5 h, a velocidade é 100 mL/h. A UKKA indica glicose 10% a 50 mL/h; com SG 5%, a mesma carga de glicose exige o dobro do volume.'
      : `Revise: SG 5% contém 0,05 g/mL. Para 25 g, são 500 mL ao total; em 5 h, 100 mL/h. Você selecionou ${selected.value} mL/h.`;
    updateCalcProgress();
  }
  function updateCalcProgress() { $('[data-stage="2"] [data-next]').disabled = !(state.d50Correct && state.sg5Correct); }
  $('#check-d50').addEventListener('click', checkD50);
  $('#check-sg5').addEventListener('click', checkSg5Equivalent);
  $$('input[name="d50-volume"]').forEach(input => input.addEventListener('change', () => { state.d50Correct = false; $('#d50-feedback').hidden = true; updateCalcProgress(); }));
  $$('input[name="d50-ampoules"]').forEach(input => input.addEventListener('change', () => { state.d50Correct = false; $('#d50-feedback').hidden = true; updateCalcProgress(); }));
  $$('input[name="sg5-rate"]').forEach(input => input.addEventListener('change', () => { state.sg5Correct = false; $('#sg5-feedback').hidden = true; updateCalcProgress(); }));

  const fields = [
    ['drug', 'rx-drug', value => value === 'glucose', 'Selecione glicose.'],
    ['concentration', 'rx-concentration', value => value === '50', 'Use glicose 50% (500 mg/mL) para a dose inicial de 25 g nesta referência.'],
    ['dose', 'rx-dose', value => Number(value) === 25, 'A dose inicial de glicose da referência UKKA é 25 g, associada à insulina IV.'],
    ['unit', 'rx-unit', value => value === 'g', 'Expresse a quantidade da dose em gramas; para esta dose, 25 g.'],
    ['volume', 'rx-volume', value => Number(value) === 50, 'Glicose 50% contém 0,5 g/mL: 25 g correspondem a 50 mL (cinco ampolas de 10 mL).'],
    ['route', 'rx-route', value => value === 'IV', 'Use via intravenosa conforme o esquema de insulina-glicose da UKKA.'],
    ['time', 'rx-time', value => value === '5-15', 'Para esta atividade, use a referência UKKA: administrar a dose inicial associada à insulina em 5–15 minutos.'],
    ['followup', 'rx-followup', value => value === 'd10' || value === 'd5', 'A glicemia simulada é 108 mg/dL (6,0 mmol/L), abaixo do limite UKKA de 126 mg/dL (7,0 mmol/L). A referência é glicose 10% a 50 mL/h por 5 h; a equivalência de SG 5% é 100 mL/h por 5 h, sujeita ao protocolo local e à avaliação volêmica.']
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
    const prep = [
      ['dose total de 25 g, ou 50 mL (cinco ampolas)', $('#rx-prep').checked],
      ['associação e preparo com 10 UI de insulina solúvel', $('#rx-combine').checked],
      ['acesso venoso pérvio e observação do local', $('#rx-access').checked],
      ['avaliação do estado volêmico antes da infusão adicional', $('#rx-volume-status').checked]
    ];
    const prepValid = prep.every(([, checked]) => checked);
    const additionalVolume = $('#rx-followup').value === 'd5' ? '500 mL de SG 5%' : '250 mL de glicose 10%';
    results.push({ key: 'prep', valid: prepValid, explanation: prepValid ? 'Dose de glicose, associação com insulina, acesso e estado volêmico estão registrados.' : `Confira 50 mL de glicose 50%, associe 10 UI de insulina solúvel conforme o preparo UKKA, verifique o acesso venoso e avalie o estado volêmico antes da infusão adicional de ${additionalVolume}.` });
    const monitoring = [
      ['glicemia inicial e controles seriados até 6 h', $('#rx-bg').checked],
      ['potássio em 1, 2, 4, 6 e 24 h', $('#rx-k').checked],
      ['vigilância e tratamento de hipoglicemia', $('#rx-hypo').checked]
    ];
    const monitoringValid = monitoring.every(([, checked]) => checked);
    results.push({ key: 'monitoring', valid: monitoringValid, explanation: monitoringValid ? 'Glicemia e potássio serão reavaliados; há plano para reconhecer e tratar hipoglicemia.' : 'Complete os cuidados: ' + monitoring.filter(([, checked]) => !checked).map(([label]) => label).join('; ') + '.' });
    results.filter(result => result.key === 'prep' || result.key === 'monitoring').forEach(result => {
      const target = $(`[data-feedback="${result.key}"]`); target.className = 'field-feedback ' + (result.valid ? 'good' : 'bad'); target.textContent = (result.valid ? 'Correto. ' : 'Revise. ') + result.explanation;
    });
    const score = results.filter(result => result.valid).length; const complete = score === results.length;
    const followup = $('#rx-followup').value === 'd10'
      ? 'Após a dose inicial, glicose 10% IV a 50 mL/h por 5 h (250 mL = 25 g), indicada neste exercício porque a glicemia inicial é 108 mg/dL (6,0 mmol/L; abaixo de 126 mg/dL/7,0 mmol/L).'
      : $('#rx-followup').value === 'd5'
        ? 'Após a dose inicial, equivalência matemática com SG 5% IV a 100 mL/h por 5 h (500 mL = 25 g). O volume é o dobro da infusão UKKA com glicose 10%; valide com o protocolo local e o estado volêmico.'
        : 'Reavaliar a necessidade de glicose adicional conforme a glicemia inicial; neste exercício, glicose 10% IV a 50 mL/h por 5 h ou equivalência com SG 5% a 100 mL/h por 5 h.';
    $('#assembled-rx').textContent = `Glicose 50% (500 mg/mL): 25 g (50 mL; cinco ampolas de 10 mL), associada a 10 UI de insulina solúvel. Conforme o preparo UKKA, adicionar a insulina ao frasco de glicose, homogeneizar, transferir para seringa intravenosa e administrar por via IV em ${$('#rx-time').selectedOptions[0]?.textContent || 'tempo não selecionado'}, em veia de bom calibre. ${followup} Segurança: acesso venoso pérvio e inspeção do local durante a administração; avaliar sobrecarga volêmica, sobretudo na opção de SG 5%. Monitorizar glicemia antes e aos 30, 60, 90, 120, 180, 240, 300 e 360 min; reavaliar potássio em 1, 2, 4, 6 e 24 h; vigiar hipoglicemia.`;
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
