(async () => {
  'use strict';
  const courseId='fa3c5d8d-94c4-4321-be7a-1cc45741a983';
  const accessMessage=document.getElementById('case-access');
  try {
    await Store.iniciar({atualizar:true});
    if(!Store.proteger())return;
    if(!Store.acharCurso(courseId)){
      accessMessage.textContent='Este caso está disponível para quem tem acesso ao curso de Hipercalemia.';
      return;
    }
  } catch {
    accessMessage.textContent='Não foi possível verificar o acesso. Recarregue a página para tentar novamente.';
    return;
  }
  accessMessage.hidden=true;
  document.querySelector('main').hidden=false;
  const rules = window.Caso03Rules;
  const draftKey = 'agoramed-agoraprescreva-caso03-draft-v1';
  const historyKey = 'agoramed-agoraprescreva-caso03-history-v1';
  const startedAt = new Date().toISOString();
  let pendingOperationId = null;
  const $ = selector => document.querySelector(selector);
  const setStage = stage => document.querySelectorAll('[data-case03-step]').forEach((node,index)=>{
    const active=['assessment','prescription','feedback'].indexOf(stage);
    node.classList.toggle('done',index<active);node.classList.toggle('active',index===active);
  });
  const catalog = new Map(rules.catalog.map(item => [item.id,item]));
  const input = (label,field,placeholder='',type='text') => `<label>${label}<input data-field="${field}" type="${type}" placeholder="${placeholder}"></label>`;
  const select = (label,field,options) => `<label>${label}<select data-field="${field}"><option value="">Selecione</option>${options.map(value=>`<option>${value}</option>`).join('')}</select></label>`;
  const orderState = [];
  const checks = [
    ['cardiac-monitor','Monitorização cardíaca contínua'],['serial-ecg','ECG após cálcio e conforme evolução'],
    ['serial-potassium','Potássio em 1, 2, 4, 6 e 24 horas, ajustar à evolução'],
    ['serial-glucose','Glicemia basal e em série até 6 horas após insulina'],
    ['nephrology','Avaliação nefrológica urgente'],['urgent-dialysis','Encaminhar para hemodiálise urgente']
  ];
  const catalogSelect = $('#rx-catalog');
  for (const entry of rules.catalog) catalogSelect.add(new Option(entry.name,entry.id));
  $('#rx-checks').innerHTML = checks.map(([id,label])=>`<label><input type="checkbox" data-conduct="${id}"><span>${label}</span></label>`).join('');

  function addOrder(id, data={}) {
    const entry = catalog.get(id);
    if (!entry) return;
    const order = {...entry,...data};
    const card = document.createElement('article');
    card.className = 'order-card' + (id==='potassium' ? ' is-danger':'');
    card.dataset.id = id;
    card.innerHTML = `<div class="order-card-top"><span class="order-name">${entry.name}</span><div class="order-actions"><button type="button" data-up aria-label="Mover para cima">↑</button><button type="button" data-down aria-label="Mover para baixo">↓</button><button type="button" data-delete>Remover</button></div></div><div class="form-grid">
      ${input('Apresentação / concentração','concentration','Ex.: 10% ou 100 UI/mL')}
      ${input('Dose / quantidade','dose','Valor da dose','number')}
      ${select('Unidade','unit',['mL','g','mg','UI','mEq','mL/h'])}
      ${select('Via','route',['IV','Oral','Nebulização','Outra'])}
      ${input('Volume final / preparo','volume','Ex.: 50 mL')}
      ${input('Tempo / velocidade','duration','Minutos ou horas','number')}
      ${select('Frequência','frequency',['1','2','3','4'])}
      ${input('Duração / observação','instructions','Indicação, horários, monitorização')}
      ${input('Sinônimo (opcional)','name','Nome genérico')}
      </div>`;
    card.querySelectorAll('[data-field]').forEach(field=>{field.value=order[field.dataset.field]||'';field.addEventListener('input',persistDraft);field.addEventListener('change',persistDraft)});
    card.querySelector('[data-delete]').addEventListener('click',()=>{card.remove();persistDraft()});
    card.querySelector('[data-up]').addEventListener('click',()=>{if(card.previousElementSibling)card.parentElement.insertBefore(card,card.previousElementSibling);persistDraft()});
    card.querySelector('[data-down]').addEventListener('click',()=>{if(card.nextElementSibling)card.parentElement.insertBefore(card.nextElementSibling,card);persistDraft()});
    $('#rx-orders').append(card);
  }
  function readState() {
    const items = Array.from($('#rx-orders').children).map(card=>Object.fromEntries([
      ['id',card.dataset.id],['name',card.querySelector('[data-field="name"]').value.trim()||catalog.get(card.dataset.id).name],
      ...Array.from(card.querySelectorAll('[data-field]'),field=>[field.dataset.field,field.value.trim()])
    ]));
    for(const checkbox of $('#rx-checks').querySelectorAll('input:checked')) items.push({id:checkbox.dataset.conduct,name:catalog.get(checkbox.dataset.conduct).name,type:'conduct'});
    return {items};
  }
  function persistDraft() {
    try {localStorage.setItem(draftKey,JSON.stringify({items:Array.from($('#rx-orders').children).map(card=>({id:card.dataset.id,...Object.fromEntries(Array.from(card.querySelectorAll('[data-field]'),field=>[field.dataset.field,field.value]))})),conduct:Array.from($('#rx-checks').querySelectorAll('input:checked'),box=>box.dataset.conduct)}));$('#rx-status').textContent='Rascunho salvo neste navegador.';} catch {$('#rx-status').textContent='Não foi possível salvar o rascunho neste navegador.';}
    $('#rx-review-content').dataset.dirty='true';
  }
  function restoreDraft() {
    try {const saved=JSON.parse(localStorage.getItem(draftKey)||'{}');for(const item of saved.items||[]) addOrder(item.id,item);for(const id of saved.conduct||[]){const box=$(`[data-conduct="${id}"]`);if(box)box.checked=true;}} catch {localStorage.removeItem(draftKey);}
  }
  function renderReview(result) {
    const container=$('#rx-review-content');
    container.className='';
    container.innerHTML=`<div class="review-summary"><div><span>PONTUAÇÃO</span><strong class="rx-score">${result.score}/100</strong></div><div><span>SEGURANÇA</span><strong>${result.safe?'Sem erro crítico':'Revisar erro crítico'}</strong></div></div><p><strong>${result.counts.correct} acertos · ${result.counts.errors} erros · ${result.counts.omissions} omissões · ${result.counts.critical} críticos</strong></p>`+
      result.items.map(item=>`<article class="rx-review-item ${item.severity==='critical'?'rx-critical':''}"><span class="rx-status">${escapeHtml(item.status)} · ${item.severity==='critical'?'gravidade alta':item.severity==='moderate'?'revisar':'referência'}</span><h4>${escapeHtml(item.title)}</h4>${item.prescribed?`<p><strong>O que você prescreveu</strong> ${[item.prescribed.name,item.prescribed.dose,item.prescribed.unit,item.prescribed.route].filter(Boolean).map(escapeHtml).join(' · ')}</p>`:''}<p><strong>O que deveria ser feito</strong> ${escapeHtml(item.expected)}</p><p><strong>Por que isso importa</strong> ${escapeHtml(item.why)}</p></article>`).join('')+
      `<div class="rx-safety">A revisão é determinística e baseada nas regras apresentadas nesta simulação. Pontuação e referências aguardam validação de responsável médico.</div>`;
    container.dataset.dirty='false';
    if(innerWidth<=700) switchTab('review');
  }
  function history() {try{return JSON.parse(localStorage.getItem(historyKey)||'[]')}catch{return []}}
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function renderHistory() {
    const list=$('#rx-history-list');const attempts=history();
    if(!attempts.length){list.innerHTML='<p class="muted">Nenhuma tentativa finalizada neste navegador.</p>';return;}
    list.innerHTML=attempts.slice().reverse().map((attempt,index)=>`<details><summary>Tentativa ${attempts.length-index} · ${new Date(attempt.finishedAt).toLocaleString('pt-BR')} · ${attempt.score}/100</summary><p>${attempt.safe?'Sem erro crítico identificado.':'Há erro crítico de segurança.'}</p><p>${attempt.items.length} itens avaliados. ${attempt.serverId?'Tentativa registrada na sua conta.':'Snapshot preservado neste navegador.'}</p></details>`).join('');
  }
  function switchTab(name) {
    document.querySelectorAll('.rx-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.tab===name));
    document.querySelectorAll('[data-pane]').forEach(pane=>pane.classList.toggle('mobile-active',pane.dataset.pane===name));
  }
  $('#rx-add').addEventListener('click',()=>{if(!catalogSelect.value)return;addOrder(catalogSelect.value);catalogSelect.value='';$('#rx-add').disabled=true;persistDraft();if(innerWidth<=700)switchTab('prescription');});
  catalogSelect.addEventListener('change',()=>$('#rx-add').disabled=!catalogSelect.value);
  $('#rx-save').addEventListener('click',persistDraft);
  $('#rx-review').addEventListener('click',()=>{const result=rules.evaluate(readState());renderReview(result);setStage('feedback');$('#rx-status').textContent='Revisão concluída. Ajuste as ordens e revise novamente quando desejar.';});
  $('#rx-finish').addEventListener('click',async()=>{
    const state=readState();
    const result=rules.evaluate(state);
    pendingOperationId=pendingOperationId||crypto.randomUUID();
    const button=$('#rx-finish');button.disabled=true;button.setAttribute('aria-busy','true');$('#rx-status').textContent='Registrando a tentativa na sua conta…';
    let saved;
    try {
      const response=await fetch('/api/agoraprescreva',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({caseId:'03',operationId:pendingOperationId,state:{...state,startedAt}})});
      saved=await response.json();
      if(!response.ok||!saved.ok||!saved.attemptId)throw new Error(saved.erro||'Não foi possível registrar a tentativa. Tente novamente.');
    } catch(error) {
      $('#rx-status').textContent=(error.message||'Falha de conexão.')+' Seus dados continuam nesta página; tente novamente.';
      button.disabled=false;button.removeAttribute('aria-busy');return;
    }
    renderReview(result);setStage('feedback');
    pendingOperationId=null;
    try {
      const attempts=history();attempts.push({attemptId:crypto.randomUUID(),serverId:saved.attemptId,finishedAt:new Date().toISOString(),score:result.score,safe:result.safe,items:result.items});
      localStorage.setItem(historyKey,JSON.stringify(attempts));localStorage.removeItem(draftKey);renderHistory();
      $('#rx-status').textContent='Tentativa finalizada e registrada na sua conta.';
    } catch {
      $('#rx-status').textContent='Tentativa finalizada e registrada na sua conta. O histórico local não pôde ser atualizado.';
    }
    button.removeAttribute('aria-busy');
  });
  $('#rx-reset').addEventListener('click',()=>{if(!confirm('Reiniciar o exercício? O rascunho atual será removido. As tentativas finalizadas permanecem no histórico.'))return;$('#rx-orders').replaceChildren();$('#rx-checks').querySelectorAll('input').forEach(box=>box.checked=false);localStorage.removeItem(draftKey);$('#rx-review-content').className='rx-review-empty';$('#rx-review-content').textContent='Sua prescrição ainda não foi avaliada. Construa as condutas e clique em Revisar prescrição.';$('#rx-status').textContent='Exercício reiniciado.';});
  document.querySelectorAll('.rx-tabs button').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab)));
  restoreDraft();renderHistory();
})().catch(()=>{const message=document.getElementById('case-access');if(message)message.textContent='Não foi possível carregar o caso. Recarregue a página para tentar novamente.';});
