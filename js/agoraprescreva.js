(async () => {
  await Store.iniciar({ atualizar: true });
  const usuario = Store.proteger();
  if (!usuario) return;
  (() => {
  const STORAGE = `agoramed-agoraprescreva-v1:${usuario.id}`;
  const ATTEMPTS_STORAGE = `agoramed-agoraprescreva-attempts-v1:${usuario.id}`;
  const COURSE_HOME = 'https://www.andersongleryston.med.br/curso.html?id=fa3c5d8d-94c4-4321-be7a-1cc45741a983';
  const catalog = [
    ['Gluconato de cálcio 10%','calcium-gluconate'], ['Cloreto de cálcio 10%','calcium-chloride'],
    ['Insulina regular','regular-insulin'], ['Glicose 50%','glucose-50'], ['Glicose 10%','glucose-10'],
    ['Salbutamol para nebulização','salbutamol'], ['Bicarbonato de sódio','bicarbonate'],
    ['Furosemida','furosemide'], ['Ciclosilicato de zircônio sódico','binder'],
    ['Anlodipino','amlodipine'], ['Soro fisiológico 0,9%','saline'], ['Gluconato de potássio','potassium']
  ];
  const conductItems = [
    ['continuous-ecg','Monitorização cardíaca contínua','Manter durante estabilização e tratamento inicial.'],
    ['control-ecg','ECG de controle','Repetir conforme resposta clínica e evolução.'],
    ['glucose-monitor','Controle de glicemia','Monitorar após insulina; considerar controles seriados.'],
    ['urine-output','Controle rigoroso de diurese','Paciente oligúrico: cerca de 100 mL nas últimas 12 h.'],
    ['repeat-potassium','Nova dosagem de potássio','Reavaliar em 1–2 h e conforme resposta.'],
    ['nephrology','Avaliação nefrológica urgente','DRC avançada, oligúria e K 7,2 mEq/L.'],
    ['hemodialysis','Planejar hemodiálise urgente','Estratégia definitiva a ser considerada no cenário.'],
    ['hold-losartan','Revisar losartana','Reavaliar durante o quadro agudo.'],
    ['hold-spironolactone','Revisar espironolactona','Reavaliar durante o quadro agudo.'],
    ['other-monitor','Outras medidas / reavaliação clínica','Descreva em orientações adicionais.']
  ];
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = read();
  const catalogEl = $('#catalog');
  catalog.forEach(([name,id]) => { const option=document.createElement('option'); option.value=id; option.textContent=name; catalogEl.append(option); });
  const recordViews = {
    summary:`<h3>Queixa e avaliação inicial</h3><p>Fraqueza progressiva, náuseas e palpitações há cerca de seis horas. Consciente, orientado e com perfusão periférica preservada.</p><div class="record-highlight"><span>POTÁSSIO SÉRICO</span><strong>7,2 mEq/L</strong></div><p>Resultado confirmado em amostra não hemolisada. ECG com bradicardia, ondas P de baixa amplitude e QRS alargado (~160 ms).</p>`,
    labs:`<h3>Resultados disponíveis</h3><div class="record-list"><div><span>Potássio</span><b>7,2 mEq/L</b></div><div><span>Creatinina</span><b>5,8 mg/dL</b></div><div><span>Ureia</span><b>156 mg/dL</b></div><div><span>Glicemia</span><b>112 mg/dL</b></div><div><span>Sódio</span><b>137 mEq/L</b></div><div><span>pH arterial</span><b>7,34</b></div><div><span>Bicarbonato</span><b>21 mEq/L</b></div><div><span>Diurese</span><b>~100 mL / 12 h</b></div></div><p>DRC avançada e oligúria. Valores fictícios para esta atividade.</p>`,
    history:`<h3>Antecedentes e medicações habituais</h3><p>Doença renal crônica avançada, hipertensão arterial e diabetes mellitus tipo 2. Não realiza hemodiálise regularmente. Redução importante do volume urinário nas últimas 24 horas.</p><div class="patient-note"><b>Uso habitual:</b> losartana, espironolactona e anlodipino. Sem alergias medicamentosas conhecidas; sem uso de digoxina.</div><p>Acesso venoso periférico pérvio em veia calibrosa do antebraço.</p>`
  };
  $('#recordView').innerHTML=recordViews.summary;
  $$('[data-record]').forEach(button=>button.addEventListener('click',()=>{$$('[data-record]').forEach(item=>item.classList.toggle('selected',item===button));$('#recordView').innerHTML=recordViews[button.dataset.record]}));
  conductItems.forEach(([id,label,help])=>{const item=document.createElement('label');item.className='conduct-option';item.innerHTML=`<input type="checkbox" data-conduct="${id}"><span>${escapeHtml(label)}<small>${escapeHtml(help)}</small></span>`;const input=item.querySelector('input');input.checked=state.actions.includes(id);input.addEventListener('change',save);$('#conductGrid').append(item)});
  $('#notes').value=state.notes||'';$('#notes').addEventListener('input',save);
  $('#addOrder').addEventListener('click',()=>{const found=catalog.find(([,id])=>id===catalogEl.value);if(!found)return;state.orders.push({uid:makeId(),id:found[1],name:found[0],presentation:'',dose:'',unit:'',route:'',diluent:'',volume:'',rate:'',frequency:'',instructions:''});catalogEl.value='';save();renderOrders()});
  $('#reviewBtn').addEventListener('click',showFeedback);$('#backBtn').addEventListener('click',backToEditor);$('#editBtn').addEventListener('click',backToEditor);
  $('#reassessBtn').addEventListener('click',showReassessment);$('#backFeedback').addEventListener('click',showFeedback);$('#returnToRx').addEventListener('click',backToEditor);
  $('#finishBtn').addEventListener('click',()=>{hideScreens();$('#finished').classList.remove('hidden');$('.steps').classList.add('hidden');window.scrollTo({top:0,behavior:'smooth'})});
  $('#backToFeedbackFinal').addEventListener('click',showFeedback);
  $('#againBtn').addEventListener('click',()=>{state.reassessment={};delete state.operationId;$$('.choice-list button').forEach(button=>button.classList.remove('selected'));$$('.answer-feedback').forEach(feedback=>{feedback.className='answer-feedback hidden';feedback.textContent=''});save();backToEditor()});
  $('#finalizeBtn').addEventListener('click',finalizeAttempt);
  $$('.mobile-tabs button').forEach(button=>button.addEventListener('click',()=>{$$('.mobile-tabs button').forEach(item=>item.classList.toggle('active',item===button));$('#workGrid').classList.toggle('mobile-patient',button.dataset.pane==='patient');$('#workGrid').classList.toggle('mobile-orders',button.dataset.pane==='orders')}));
  $$('.choice-list button').forEach(button=>button.addEventListener('click',()=>{
    const group=button.parentElement;group.querySelectorAll('button').forEach(item=>item.classList.remove('selected'));button.classList.add('selected');
    const first=group.dataset.group==='time15';const correct=button.dataset.answer===(first?'continue':'monitor');const feedback=$(first?'#fb15':'#fb90');
    state.reassessment=state.reassessment||{};state.reassessment[first?'15min':'90min']={answer:button.dataset.answer,correct,answeredAt:new Date().toISOString()};persist();
    feedback.className=`answer-feedback ${correct?'correct':'incorrect'}`;
    feedback.textContent=first?(correct?'Correto. A melhora do ECG não remove o potássio nem elimina o risco de recorrência. Mantenha monitorização e conclua a estratégia de remoção.':'Reavalie: a melhora eletrocardiográfica inicial não significa remoção do potássio. Mantenha vigilância e prossiga com o plano. '):(correct?'Correto. Mantenha vigilância glicêmica e cardíaca, reavalie o potássio e siga com a estratégia de remoção.':'Reavalie: o potássio continua elevado e a glicemia pode cair após insulina. Mantenha controles e o plano de remoção.');
  }));
  function read(){try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(!saved)return{orders:[],actions:[],notes:''};saved.actions=saved.actions||saved.conducts||[];saved.actions=saved.actions.map(action=>typeof action==='number'?conductItems[action]?.[0]:action).filter(Boolean);saved.orders=(saved.orders||[]).map(order=>{if(order.id==null){const found=catalog.find(([name])=>name===order.name);order.id=found?.[1]||''}return order});return saved}catch{return{orders:[],actions:[],notes:''}}}
  function makeId(){return crypto.randomUUID?crypto.randomUUID(): 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)})}
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(state))}catch(e){}}
  function save(){state.actions=$$('input[data-conduct]:checked').map(input=>input.dataset.conduct);state.notes=$('#notes').value;persist();updateCounts()}
  function updateCounts(){const count=state.orders.length;$('#orderCount').textContent=count;$('#medCount').textContent=`${count} ${count===1?'registrado':'registrados'}`;$('#mobileCount').textContent=count}
  function renderOrders(){const list=$('#ordersList');list.innerHTML='';if(!state.orders.length){list.innerHTML='<div class="empty-state"><span>＋</span><b>Nenhuma ordem adicionada</b><small>Selecione um item do catálogo para começar a compor a prescrição.</small></div>';updateCounts();return}
    state.orders.forEach((order,index)=>{const fragment=$('#orderTemplate').content.cloneNode(true);fragment.querySelector('.order-number').textContent=String(index+1).padStart(2,'0');fragment.querySelector('.order-name').textContent=order.name;
      fragment.querySelectorAll('[data-field]').forEach(field=>{field.value=order[field.dataset.field]||'';field.addEventListener('input',()=>{order[field.dataset.field]=field.value;save()});field.addEventListener('change',()=>{order[field.dataset.field]=field.value;save()})});
      fragment.querySelector('.delete').addEventListener('click',()=>{state.orders=state.orders.filter(item=>item.uid!==order.uid);save();renderOrders()});fragment.querySelector('.up').addEventListener('click',()=>moveOrder(index,-1));fragment.querySelector('.down').addEventListener('click',()=>moveOrder(index,1));list.append(fragment)
    });updateCounts()
  }
  function moveOrder(index,delta){const next=index+delta;if(next<0||next>=state.orders.length)return;[state.orders[index],state.orders[next]]=[state.orders[next],state.orders[index]];save();renderOrders()}
  function toRuleState(){return{meds:state.orders.map(order=>({...order,diluent:order.diluent||order.preparation||''})),actions:state.actions}}
  function showFeedback(){
    save();const grade=window.AgoraMedPrescriptionRules.gradePrescription(toRuleState());
    $('#scoreTotal').textContent=grade.total;$('#passStatus').textContent=grade.meetsPreviewThreshold?'CRITÉRIOS DA PRÉVIA ATINGIDOS':'REVISÃO RECOMENDADA';$('#passStatus').className=`score-status ${grade.meetsPreviewThreshold?'passed':'review'}`;
    $('#scoreTitle').textContent=grade.critical.length?'Há pontos prioritários para revisar.':grade.pending.length?'Sua prescrição tem itens que pedem conferência.':'Nenhum alerta prioritário foi identificado pelas regras desta prévia.';
    $('#scoreSummary').textContent=grade.critical.length?`${grade.critical.length} alerta(s) prioritário(s) e ${grade.pending.length} orientação(ões) para revisar.`:grade.pending.length?`${grade.pending.length} orientação(ões) para revisar.`:'A análise segue os critérios preliminares desta atividade.';
    $('#domainGrid').innerHTML=grade.domains.map(domain=>`<article class="domain-card"><div><span>${escapeHtml(domain.name)}</span><strong>${domain.score}<small> / ${domain.max}</small></strong></div><i><b style="width:${domain.max?Math.round(domain.score/domain.max*100):0}%"></b></i></article>`).join('');
    const alertBox=$('#feedbackAlerts');alertBox.innerHTML='';alertBox.classList.toggle('hidden',!grade.positive?.length&&!grade.critical.length&&!grade.pending.length);
    if(grade.positive?.length)alertBox.insertAdjacentHTML('beforeend',`<article class="alert-block positive"><h3>Condutas reconhecidas</h3><ul>${grade.positive.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`);
    if(grade.critical.length)alertBox.insertAdjacentHTML('beforeend',`<article class="alert-block critical"><h3>Alertas prioritários</h3><ul>${grade.critical.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`);
    if(grade.pending.length)alertBox.insertAdjacentHTML('beforeend',`<article class="alert-block pending"><h3>Pontos para revisar e como corrigir</h3><ul>${grade.pending.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`);
    $('#reviewOrders').innerHTML=state.orders.length?`<ul>${state.orders.map(order=>{const values=[order.presentation,order.dose&&`${order.dose} ${order.unit||''}`,order.route,order.diluent&&`Preparo: ${order.diluent}`,order.volume&&`Volume: ${order.volume}`,order.rate&&`Tempo/velocidade: ${order.rate}`,order.frequency&&`Frequência: ${order.frequency}`,order.instructions].filter(Boolean);return `<li class="review-item"><b>${escapeHtml(order.name)}</b><br>${values.length?values.map(escapeHtml).join(' · '):'<span>Sem detalhes preenchidos</span>'}</li>`}).join('')}</ul>`:'<p>Nenhum medicamento adicionado.</p>';
    const selected=state.actions.map(id=>conductItems.find(([actionId])=>actionId===id)?.[1]).filter(Boolean);
    $('#reviewPlan').innerHTML=`${selected.length?`<ul>${selected.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:'<p>Nenhuma conduta selecionada.</p>'}${state.notes?`<div class="review-item"><b>Orientações registradas</b><br>${escapeHtml(state.notes)}</div>`:''}`;
    const references=[
      'Estabilização cardíaca: considerar cálcio IV diante de alteração eletrocardiográfica; acompanhar ECG e reavaliar conforme resposta.',
      'Redistribuição intracelular: referência preliminar contempla insulina associada à glicose; revisar dose, via, prevenção e monitorização de hipoglicemia.',
      'Remoção do potássio: registrar avaliação nefrológica urgente e plano de remoção definitiva, considerando DRC avançada e oligúria.',
      'Monitorização e segurança: plano de vigilância cardíaca, ECG, glicemia, diurese, potássio e reavaliação clínica.',
      'Revisar temporariamente losartana e espironolactona no contexto agudo. As alternativas e condutas adicionais requerem avaliação clínica.'
    ];
    $('#referencePlan').innerHTML=`<ul>${references.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    hideScreens();$('#review').classList.remove('hidden');$('.steps').classList.remove('hidden');$('.mobile-tabs').classList.add('hidden');updateStep(3);window.scrollTo({top:0,behavior:'smooth'});
  }
  function showReassessment(){hideScreens();$('#reassess').classList.remove('hidden');$('.steps').classList.remove('hidden');$('.mobile-tabs').classList.add('hidden');updateStep(3);window.scrollTo({top:0,behavior:'smooth'})}
  async function finalizeAttempt(){
    save();
    const grade=window.AgoraMedPrescriptionRules.gradePrescription(toRuleState());
    state.operationId=state.operationId||makeId();
    const attempt={id:state.operationId,completedAt:new Date().toISOString(),courseId:'fa3c5d8d-94c4-4321-be7a-1cc45741a983',activity:'AgoraPrescreva',score:grade.total,domains:grade.domains,positive:grade.positive,critical:grade.critical,pending:grade.pending,orders:state.orders,actions:state.actions,notes:state.notes,reassessment:state.reassessment||{}};
    persist();
    const button=$('#finalizeBtn');const status=$('#saveStatus');button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='Salvando sua tentativa…';
    let response;
    try{const request=await fetch('/api/agoraprescreva',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({operationId:state.operationId,state:{orders:state.orders,actions:state.actions,notes:state.notes,reassessment:state.reassessment||{}}})});response=await request.json();if(!request.ok||!response.ok)throw new Error(response.erro||'Não foi possível salvar sua tentativa. Tente novamente.')}catch(error){status.textContent=error.message||'Falha de conexão. Sua tentativa permanece neste dispositivo; tente novamente.';button.disabled=false;button.removeAttribute('aria-busy');return}
    let attempts=[];try{attempts=JSON.parse(localStorage.getItem(ATTEMPTS_STORAGE)||'[]')}catch{}
    if(!attempts.some(item=>item.id===attempt.id)){attempt.serverId=response.attemptId;attempts.push(attempt);try{localStorage.setItem(ATTEMPTS_STORAGE,JSON.stringify(attempts))}catch{}}
    window.location.assign(COURSE_HOME);
  }
  function backToEditor(){hideScreens();$('#workGrid').classList.remove('hidden');$('.steps').classList.remove('hidden');$('.mobile-tabs').classList.remove('hidden');updateStep(2);window.scrollTo({top:0,behavior:'smooth'})}
  function hideScreens(){$('#workGrid').classList.add('hidden');$('#review').classList.add('hidden');$('#reassess').classList.add('hidden');$('#finished').classList.add('hidden')}
  function updateStep(active){$$('.steps .step').forEach((step,index)=>{step.classList.toggle('active',index+1===active);step.classList.toggle('done',index+1<active)})}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
  renderOrders();updateCounts();
  })();
})().catch(()=>{const status=document.querySelector('#saveStatus');if(status)status.textContent='Não foi possível validar sua sessão. Entre novamente para continuar.'});
