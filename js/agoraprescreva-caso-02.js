'use strict';

(async () => {
  const courseId = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
  const courseUrl = 'curso.html?id=' + courseId;
  const accessMessage = document.getElementById('case-access');
  try {
    await Store.iniciar({ atualizar: true });
    if (!Store.proteger()) return;
    if (!Store.acharCurso(courseId)) {
      accessMessage.textContent = 'Este caso está disponível para quem tem acesso ao curso de Hipercalemia.';
      return;
    }
  } catch {
    accessMessage.textContent = 'Não foi possível verificar o acesso. Recarregue a página para tentar novamente.';
    return;
  }

  const byId = id => document.getElementById(id)
  // Mesma ordem relativa do Caso 01. Resina e hemodiálise completam o catálogo.
  const catalog = {
    gluconate: 'Gluconato de cálcio 10%', chloride: 'Cloreto de cálcio 10%',
    insulin: 'Insulina regular', glucose50: 'Glicose hipertônica 50%', glucose10: 'Glicose 10%',
    salbutamol: 'Salbutamol para nebulização', bicarb: 'Bicarbonato de sódio',
    loop: 'Furosemida', zirconium: 'Ciclosilicato de zircônio sódico',
    amlodipine: 'Anlodipino', saline: 'Soro fisiológico 0,9%', potassium: 'Gluconato de potássio',
    resin: 'Resina trocadora de cálcio', dialysis: 'Hemodiálise'
  }
  const stepNodes = [...document.querySelectorAll('[data-case02-step]')]
  function setStage(stage) {
    const order = ['assessment', 'prescription', 'feedback']
    const activeIndex = order.indexOf(stage)
    stepNodes.forEach((node, index) => {
      node.classList.toggle('done', index < activeIndex)
      node.classList.toggle('active', index === activeIndex)
    })
  }
  setStage('prescription')
  const pickers = new Map()
  for (const picker of document.querySelectorAll('[data-order-picker]')) {
    const orders = new Map()
    pickers.set(picker.closest('form').id, orders)
    picker.innerHTML = `<div class="catalog"><label>Catálogo de medicamentos e procedimentos
      <select><option value="">Selecione um item</option></select></label>
      <button type="button" class="secondary" disabled>Adicionar</button></div>
      <small class="catalog-empty">Nenhuma ordem adicionada. Você pode registrar uma ou mais ordens.</small>
      <div class="order-list"></div>`
    const select = picker.querySelector('select')
    const add = picker.querySelector('button')
    const list = picker.querySelector('.order-list')
    const empty = picker.querySelector('.catalog-empty')
    for (const [id, name] of Object.entries(catalog)) select.add(new Option(name, id))
    select.addEventListener('change', () => { add.disabled = !select.value })
    add.addEventListener('click', () => {
      const id = select.value
      if (!id || orders.has(id)) return
      const item = document.createElement('fieldset')
      item.className = 'order-item'
      const isProcedure = id === 'dialysis'
      item.innerHTML = `<legend>${catalog[id]}</legend>
        <div data-editor>
        ${isProcedure ? '' : `<div class="fields">
        <label>Dose por administração<input data-field="dose" inputmode="decimal"></label>
        <label>Unidade<select data-field="unit"><option value="">Selecione</option><option>mg</option><option>g</option><option>mL</option><option>UI</option><option>mEq</option><option>mmol</option></select></label>
        <label>Via<select data-field="route"><option value="">Selecione</option><option>IV</option><option>Oral</option><option>Nebulização</option><option>Subcutânea</option><option>Outra</option></select></label>
        <label>Horário / frequência<select data-field="timing"><option value="">Selecione</option><option value="now">Agora, reavaliar antes de repetir</option><option value="8">A cada 8 horas</option><option value="12">A cada 12 horas</option><option value="24">A cada 24 horas</option><option value="later">Amanhã</option></select></label>
        </div>`}
        <label>${isProcedure ? 'Quando e por quê?' : 'Orientações (opcional)'}<input data-field="notes"></label>
        </div>
        <div class="order-summary" data-summary hidden>
          <p data-prescription></p>
          <p data-notes></p>
        </div>
        <div class="order-actions">
          <button type="button" data-save>Salvar ${isProcedure ? 'procedimento' : 'medicação'}</button>
          <button type="button" class="secondary" data-remove>Remover</button>
          <small class="order-status" role="status"></small>
        </div>`
      orders.set(id, item)
      list.append(item)
      empty.hidden = true
      select.querySelector('[value="' + id + '"]').disabled = true
      select.value = ''
      add.disabled = true
      const firstField = item.querySelector('input')
      const editor = item.querySelector('[data-editor]')
      const summary = item.querySelector('[data-summary]')
      const prescription = item.querySelector('[data-prescription]')
      const notes = item.querySelector('[data-notes]')
      const save = item.querySelector('[data-save]')
      const status = item.querySelector('.order-status')
      const saveLabel = save.textContent
      let saved = false
      firstField.focus()
      save.addEventListener('click', () => {
        saved = !saved
        if (saved) {
          const scheduled = editor.querySelector('[data-field="timing"]')
          const timing = scheduled?.value ? scheduled.selectedOptions[0].textContent : ''
          const dose = [orderValue(item, 'dose'), orderValue(item, 'unit')].filter(Boolean).join(' ')
          const route = orderValue(item, 'route')
          prescription.textContent = [dose, route === 'IV' ? 'via endovenosa (IV)' : route, timing]
            .filter(Boolean).join(' · ')
          prescription.hidden = !prescription.textContent
          const instructions = orderValue(item, 'notes')
          notes.textContent = instructions ? (isProcedure ? '' : 'Orientações: ') + instructions : ''
          notes.hidden = !instructions
        }
        editor.hidden = saved
        summary.hidden = !saved
        item.classList.toggle('is-saved', saved)
        save.textContent = saved ? 'Editar' : saveLabel
        status.textContent = saved ? 'Ordem salva nesta tentativa.' : 'Em edição.'
        if (!saved) firstField.focus()
      })
      item.querySelector('[data-remove]').addEventListener('click', () => {
        orders.delete(id)
        item.remove()
        empty.hidden = orders.size > 0
        select.querySelector('[value="' + id + '"]').disabled = false
        select.focus()
      })
    })
  }
  function orderValue(item, key) {
    return item.querySelector('[data-field="' + key + '"]')?.value.trim() || ''
  }
  const unsuitable = {
    gluconate: 'Não indicado agora. O cálcio protege o coração quando há alterações eletrocardiográficas atribuíveis à hipercalemia. Aqui não há alterações novas no ECG e o potássio não está na faixa grave.',
    chloride: 'Não indicado agora pelo mesmo critério de proteção cardíaca. O cloreto de cálcio não reduz o potássio sérico.',
    insulin: 'Não indicada agora. A insulina desloca temporariamente o potássio para dentro da célula e pode causar hipoglicemia. Neste ponto da evolução, não há indicação de redução rápida.',
    glucose50: 'Não indicada para a hipercalemia isoladamente. A glicose é usada para reduzir o risco de hipoglicemia quando se indica insulina para redistribuir potássio. Esse esquema não é necessário agora.',
    glucose10: 'Não indicada para a hipercalemia isoladamente. Sem indicação de insulina para redistribuir potássio, não há motivo para prescrever glicose para esse fim neste caso.',
    salbutamol: 'Não indicado agora. A nebulização pode ajudar a redistribuir potássio em situações que exigem redução rápida. Nesta etapa, priorize tratar a congestão e acompanhar os exames.',
    zirconium: 'Não é a prioridade no quadro apresentado. A decisão sobre um quelante depende da persistência do potássio elevado e da resposta ao tratamento da causa.',
    resin: 'Não indicada de rotina neste quadro. A resina tem efeito menos previsível e pode provocar efeitos gastrointestinais. Priorize a correção do fator precipitante e reavalie.',
    dialysis: 'Não indicada de urgência neste momento. DRC estágio 4, isoladamente, não indica diálise. Reconsidere se houver hipercalemia ou congestão refratária, deterioração ou outra indicação de urgência.',
    amlodipine: 'Não é uma medida para corrigir a hipercalemia nem para descongestionar. A indicação anti-hipertensiva pode ser revista separadamente.',
    saline: 'Não indicado para expansão neste momento. O paciente está congesto e não há sinais de hipoperfusão. O aporte de sódio e volume pode piorar a congestão.',
    potassium: 'Não indicado. O potássio está elevado neste cenário; suplementá-lo pode agravar a hipercalemia.'
  }
  function assessOrders(formId) {
    const admission = formId === 'initial'
    const orders = pickers.get(formId)
    const messages = []
    const target = admission ? 'loop' : 'bicarb'
    if (!orders.has(target)) messages.push(admission
      ? 'Faltou a furosemida IV, a escolha indicada para a descongestão inicial de Carlos.'
      : 'Faltou abordar a acidose persistente. Para Carlos, a escolha de referência nesta etapa é iniciar bicarbonato de sódio por via oral.')
    for (const [id, item] of orders) {
      const get = key => orderValue(item, key)
      let result
      if (id === target) {
        const raw = get('dose')
        const dose = /^\d+(?:[.,]\d+)?$/.test(raw) ? Number(raw.replace(',', '.')) : NaN
        const unit = get('unit')
        const mg = unit === 'g' ? dose * 1000 : unit === 'mg' ? dose : NaN
        const route = get('route')
        const timing = get('timing')
        if (admission) {
          const adjustments = []
          if (mg !== 80) {
            adjustments.push(mg === 40
              ? 'Os 40 mg correspondem à dose oral diária habitual. Use 80 mg como dose inicial de referência neste caso.'
              : 'Para este caso, registre 80 mg e confira a unidade.')
          }
          if (route !== 'IV') adjustments.push('Selecione a via endovenosa para a descongestão inicial.')
          if (timing !== 'now') adjustments.push('Prescreva agora e reavalie a resposta antes de repetir.')
          result = adjustments.length
            ? 'Você acertou ao escolher a furosemida. ' + adjustments.join(' ')
            : 'Você acertou a escolha e a ordem inicial: furosemida 80 mg IV agora, com reavaliação antes de repetir.'
        } else {
          result = assessBicarbonate(dose, unit, mg, route, timing)
        }
      } else if (id === 'bicarb') {
        result = 'Não é a prioridade na admissão. Bicarbonato IV não é rotina para baixar o potássio e a carga de sódio merece cautela durante a congestão. Reavalie a acidose depois da descongestão.'
      } else if (id === 'loop') {
        result = 'A congestão já resolveu. Reavalie se ainda precisa da via IV e ajuste a manutenção oral conforme volume, diurese e função renal.'
      } else {
        result = unsuitable[id]
      }
      messages.push(catalog[id] + ' — ' + result)
    }
    return messages
  }
  function assessBicarbonate(dose, unit, mg, route, timing) {
    const inEquivalents = unit === 'mEq' || unit === 'mmol'
    const matchesDose = mg === 500 || (inEquivalents && dose >= 5.95 && dose <= 6)
    if (matchesDose && route === 'Oral' && timing === '8') {
      return 'Você acertou a escolha, a dose, a via e o intervalo. Essa ordem repõe bicarbonato por via oral em três tomadas diárias após a descongestão.'
    }

    const adjustments = []
    if (inEquivalents && dose === 25 && timing === '24') {
      adjustments.push('Revise a dose e o intervalo. Você prescreveu 25 ' + unit + ' em dose única diária, o equivalente a cerca de 2.100 mg por tomada. A referência para Carlos é 500 mg por tomada a cada 8 horas, cerca de 18 mEq ao dia. A sua ordem concentra a reposição em uma tomada e fornece mais sódio ao longo do dia.')
    } else {
      if (!matchesDose) adjustments.push('Revise a dose por tomada. A referência é 500 mg, equivalentes a aproximadamente 6 mEq. Se prescrever uma solução, confira a concentração antes de converter para mL.')
      if (timing !== '8') adjustments.push('Revise o intervalo. A referência é uma tomada a cada 8 horas, totalizando três tomadas ao dia.')
    }
    if (route !== 'Oral') adjustments.push('Ajuste para a via oral. Carlos está estável e a reposição é para a acidose persistente da DRC.')
    const recognition = route === 'Oral'
      ? 'Você acertou ao escolher bicarbonato de sódio por via oral para a acidose persistente.'
      : 'Você acertou ao escolher bicarbonato de sódio para a acidose persistente.'
    return [recognition, ...adjustments].join(' ')
  }
  function scoreFor(form) {
    const id = form.id
    if (id === 'initial') {
      const orders = pickers.get(id)
      const item = orders?.get('loop')
      const dose = Number(orderValue(item || document.createElement('div'), 'dose').replace(',', '.'))
      const unit = orderValue(item || document.createElement('div'), 'unit')
      const route = orderValue(item || document.createElement('div'), 'route')
      const timing = orderValue(item || document.createElement('div'), 'timing')
      const mg = unit === 'g' ? dose * 1000 : unit === 'mg' ? dose : 0
      return (mg === 80 ? 40 : 0) + (route === 'IV' ? 20 : 0) + (timing === 'now' ? 10 : 0) +
        (form.elements.diuresis.checked ? 10 : 0) + (form.elements.review.checked ? 10 : 0) +
        (form.elements.potassium.value === 'early' ? 10 : 0)
    }
    if (id === 'poor-form') return new FormData(form).get('decision') === 'review' ? 100 : 0
    const order = new FormData(form)
    const orders = pickers.get(id)
    const item = orders?.get('bicarb')
    const rawDose = orderValue(item || document.createElement('div'), 'dose')
    const dose = Number(rawDose.replace(',', '.'))
    const unit = orderValue(item || document.createElement('div'), 'unit')
    const mg = unit === 'g' ? dose * 1000 : unit === 'mg' ? dose : (unit === 'mEq' || unit === 'mmol') && dose >= 5.95 && dose <= 6 ? 500 : 0
    const prescription = mg === 500 && orderValue(item || document.createElement('div'), 'route') === 'Oral' && orderValue(item || document.createElement('div'), 'timing') === '8'
    return (prescription ? 40 : 0) + (order.get('loop') === 'review' ? 20 : 0) +
      (order.has('labs') ? 20 : 0) + (order.has('fluid') ? 20 : 0)
  }
  function scoreDomains(form) {
    if (form.id === 'initial') {
      const item = pickers.get(form.id)?.get('loop')
      const dose = Number(orderValue(item || document.createElement('div'), 'dose').replace(',', '.'))
      const unit = orderValue(item || document.createElement('div'), 'unit')
      const mg = unit === 'g' ? dose * 1000 : unit === 'mg' ? dose : 0
      return [
        {name: 'Dose inicial', score: mg === 80 ? 40 : 0, max: 40},
        {name: 'Via e momento', score: (orderValue(item || document.createElement('div'), 'route') === 'IV' ? 20 : 0) + (orderValue(item || document.createElement('div'), 'timing') === 'now' ? 10 : 0), max: 30},
        {name: 'Monitorização e controle', score: (form.elements.diuresis.checked ? 10 : 0) + (form.elements.review.checked ? 10 : 0) + (form.elements.potassium.value === 'early' ? 10 : 0), max: 30}
      ]
    }
    if (form.id === 'poor-form') {
      return [{name: 'Reavaliação e segurança', score: scoreFor(form), max: 100}]
    }
    const order = new FormData(form)
    const item = pickers.get(form.id)?.get('bicarb')
    const dose = Number(orderValue(item || document.createElement('div'), 'dose').replace(',', '.'))
    const unit = orderValue(item || document.createElement('div'), 'unit')
    const mg = unit === 'g' ? dose * 1000 : unit === 'mg' ? dose : (unit === 'mEq' || unit === 'mmol') && dose >= 5.95 && dose <= 6 ? 500 : 0
    const prescription = mg === 500 && orderValue(item || document.createElement('div'), 'route') === 'Oral' && orderValue(item || document.createElement('div'), 'timing') === '8'
    return [
      {name: 'Bicarbonato: dose e esquema', score: prescription ? 40 : 0, max: 40},
      {name: 'Revisão da furosemida', score: order.get('loop') === 'review' ? 20 : 0, max: 20},
      {name: 'Controle laboratorial', score: order.has('labs') ? 20 : 0, max: 20},
      {name: 'Vigilância volêmica', score: order.has('fluid') ? 20 : 0, max: 20}
    ]
  }
  function feedback(id, messages, explanation, score) {
    const box = byId(id)
    const form = byId(id === 'initial-feedback' ? 'initial' : id === 'poor-feedback' ? 'poor-form' : 'follow-up')
    const scoreCard = document.createElement('div')
    scoreCard.className = 'score-overview'
    scoreCard.innerHTML = `<div class="score-ring"><strong></strong><span>/ 100</span></div><div class="score-copy"><span class="score-status"></span><h3></h3><p></p></div>`
    scoreCard.querySelector('.score-ring strong').textContent = score
    scoreCard.querySelector('.score-status').textContent = 'NOTA DESTA ETAPA'
    scoreCard.querySelector('.score-copy h3').textContent = score === 100 ? 'Decisão alinhada aos critérios desta etapa.' : 'Há pontos importantes para revisar.'
    scoreCard.querySelector('.score-copy p').textContent = 'A nota resume os critérios atendidos nesta etapa. Leia o comentário clínico e a referência antes de prosseguir.'
    const domainGrid = document.createElement('div')
    domainGrid.className = 'domain-grid'
    for (const domain of scoreDomains(form)) {
      const card = document.createElement('article')
      card.className = 'domain-card'
      card.innerHTML = `<div><span></span><strong></strong></div><i><b></b></i>`
      card.querySelector('span').textContent = domain.name
      card.querySelector('strong').innerHTML = `${domain.score}<small> / ${domain.max}</small>`
      card.querySelector('i b').style.width = `${Math.round(domain.score / domain.max * 100)}%`
      domainGrid.append(card)
    }
    const list = document.createElement('ul')
    for (const message of messages) {
      const item = document.createElement('li')
      item.textContent = message
      list.append(item)
    }
    const reviewGrid = document.createElement('div')
    reviewGrid.className = 'review-grid'
    const recorded = document.createElement('article')
    recorded.className = 'review-section'
    recorded.innerHTML = '<span class="eyebrow">SUA DECISÃO</span><h3>Pontos desta etapa</h3>'
    const recordedContent = document.createElement('div')
    recordedContent.className = 'review-content'
    recordedContent.append(list)
    recorded.append(recordedContent)
    const reference = document.createElement('article')
    reference.className = 'review-section reference-section'
    reference.innerHTML = '<span class="eyebrow">PLANO DE REFERÊNCIA</span><h3>Racional clínico do cenário</h3>'
    if (explanation) reference.append(explanation.content.cloneNode(true))
    reviewGrid.append(recorded, reference)
    box.replaceChildren(scoreCard, domainGrid, reviewGrid)
    box.hidden = false
  }
  const operationId = crypto.randomUUID()
  const attemptStartedAt = new Date().toISOString()
  const reviewedSteps = new Map()
  const finishButton = byId('finish-attempt')

  function readStep(form) {
    const orders = []
    for (const [id, item] of pickers.get(form.id) || []) {
      const fields = Object.fromEntries(
        Array.from(item.querySelectorAll('[data-field]'), field => [field.dataset.field, field.value.trim()])
      )
      orders.push({id, name: catalog[id], ...fields})
    }
    return {answers: Object.fromEntries(new FormData(form)), orders}
  }

  function recordReview(form, messages) {
    const score = scoreFor(form)
    reviewedSteps.set(form.id, {
      ...readStep(form),
      score,
      reviewedAt: new Date().toISOString(),
      feedback: messages
    })
    byId('attempt-status').hidden = true
    updateFinishButton()
  }

  function selectedEvolutionForm() {
    return byId('branch').value === 'poor' ? 'poor-form' : 'follow-up'
  }

  function updateFinishButton() {
    finishButton.hidden = !reviewedSteps.has(selectedEvolutionForm())
  }

  function showAttemptStatus(message) {
    const status = byId('attempt-status')
    status.textContent = message
    status.hidden = false
    status.focus()
  }

  finishButton.addEventListener('click', async () => {
    if (finishButton.disabled) return
    const requiredSteps = ['initial', selectedEvolutionForm()]
    for (const id of requiredSteps) {
      const form = byId(id)
      const reviewed = reviewedSteps.get(id)
      const current = readStep(form)
      if (!reviewed || JSON.stringify(current) !== JSON.stringify({answers: reviewed.answers, orders: reviewed.orders})) {
        const stage = id === 'initial' ? 'a prescrição inicial' : 'a etapa de reavaliação'
        showAttemptStatus('Há alterações pendentes. Confira novamente ' + stage + ' antes de finalizar.')
        return
      }
    }

    const state = {
      startedAt: attemptStartedAt,
      finalBranch: byId('branch').value,
      reviewedSteps: Object.fromEntries(reviewedSteps),
      score: Math.round(requiredSteps.reduce((total, id) => total + reviewedSteps.get(id).score, 0) / requiredSteps.length),
    }

    const editableControls = Array.from(document.querySelectorAll('#initial input, #initial select, #initial button, #evolution input, #evolution select, #evolution button, #advance'))
      .filter(control => !control.disabled)
    for (const control of editableControls) control.disabled = true
    showAttemptStatus('Salvando a tentativa…')
    try {
      const response = await fetch('/api/agoraprescreva', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({caseId: '02', operationId, state})
      })
      const result = await response.json()
      if (!response.ok || !result.ok || !result.attemptId) {
        throw new Error(result.erro || 'Não foi possível salvar a tentativa.')
      }
    } catch (error) {
      for (const control of editableControls) control.disabled = false
      showAttemptStatus((error.message || 'Não foi possível salvar a tentativa.') + ' Seus dados continuam nesta página.')
      return
    }
    finishButton.hidden = true
    showAttemptStatus('Tentativa finalizada e salva.')
    location.assign(courseUrl)
  })

  byId('initial').addEventListener('submit', event => {
    event.preventDefault()
    const order = new FormData(event.currentTarget)
    const messages = assessOrders('initial')
    if (!order.has('diuresis') || !order.has('review')) messages.push('Registre diurese e balanço e acompanhe a resposta clínica antes da próxima ordem.')
    if (order.get('potassium') !== 'early') messages.push('Antecipe a dosagem de potássio. Neste exercício, o primeiro controle é em 2 horas.')
    feedback('initial-feedback', messages, byId('admission-explanation'), scoreFor(event.currentTarget))
    recordReview(event.currentTarget, messages)
    setStage('feedback')
    byId('advance').hidden = false
  })
  byId('advance').addEventListener('click', () => {
    byId('evolution').hidden = false
    setStage('feedback')
    byId('evolution').querySelector('h2').focus()
  })
  byId('back-to-feedback').addEventListener('click', () => {
    byId('evolution').hidden = true
    setStage('feedback')
    byId('initial-feedback').scrollIntoView({behavior: 'smooth', block: 'center'})
  })
  byId('back-to-prescription').addEventListener('click', () => {
    byId('evolution').hidden = true
    setStage('prescription')
    byId('initial').scrollIntoView({behavior: 'smooth', block: 'center'})
  })
  byId('branch').addEventListener('change', event => {
    const poor = event.target.value === 'poor'
    byId('poor').hidden = !poor
    byId('good').hidden = poor
    byId('attempt-status').hidden = true
    updateFinishButton()
  })
  byId('poor-form').addEventListener('change', () => {
    byId('poor-feedback').hidden = true
    finishButton.hidden = true
  })
  byId('poor-form').addEventListener('submit', event => {
    event.preventDefault()
    const decision = new FormData(event.currentTarget).get('decision')
    const message = decision === 'review'
      ? 'Você acertou ao reavaliar imediatamente. Você reconheceu que a primeira dose teve pouca resposta e que a subida do potássio exige monitorização e um novo plano ainda agora.'
      : 'Repetir a mesma dose e aguardar até amanhã é inadequado. Carlos continua congesto e o potássio já subiu para 6,3 mEq/L. Esperar pode atrasar o reconhecimento de arritmias ou de piora respiratória. A conduta esperada é reavaliar agora, repetir o ECG, monitorizar e tratar a hipercalemia em paralelo à descongestão.'
    feedback('poor-feedback', [message], byId('poor-explanation'), scoreFor(event.currentTarget))
    recordReview(event.currentTarget, [message])
  })
  byId('follow-up').addEventListener('submit', event => {
    event.preventDefault()
    const order = new FormData(event.currentTarget)
    const messages = assessOrders('follow-up')
    if (order.get('loop') !== 'review') messages.push('Após descongestão, reavalie a necessidade de manter furosemida IV e ajuste a manutenção.')
    if (order.has('labs') && order.has('fluid')) {
      messages.push('Você acertou ao programar os controles laboratoriais e a vigilância da pressão e dos sinais de retenção de líquido.')
    }
    if (!order.has('labs')) messages.push('Inclua o acompanhamento do bicarbonato sérico, do potássio e da função renal.')
    if (!order.has('fluid')) messages.push('Inclua a vigilância da pressão, do peso e dos sinais de retenção de líquido.')
    feedback('final-feedback', messages, byId('follow-up-explanation'), scoreFor(event.currentTarget))
    recordReview(event.currentTarget, messages)
  })
  accessMessage.hidden = true;
  byId('case-content').hidden = false;
})();
