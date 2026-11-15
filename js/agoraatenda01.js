(() => {
  'use strict';
  const Engine=window.AgoraAtendaEngine, Flow=window.AgoraAtendaFlow, Pedagogy=window.AgoraAtendaPedagogy;
  let KEY='agoramed-agoraatenda01-attempt-v1:unlinked', HISTORY='agoramed-agoraatenda01-history-v1:unlinked', ERROR_NOTEBOOK='agoramed-agoraatenda01-error-notebook-v1:unlinked', accountId=null;
  const $=selector=>document.querySelector(selector), esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=Engine.createState(), finished=false;
  function history(){try{return JSON.parse(localStorage.getItem(HISTORY)||'[]')}catch{return []}}
  function restore(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.state?.guided){state=saved.state;finished=!!saved.finished;}else if(saved?.state){const attempts=history();attempts.push({finishedAt:new Date().toISOString(),legacy:true,label:'Rascunho da versão anterior do protótipo',state:saved.state});localStorage.setItem(HISTORY,JSON.stringify(attempts));}}catch{}}
  state.guided ||= {step:'priority',answers:{},responseRecorded:{},orderIds:{},nephrologyCalled:false,removalRequested:false};
  state.guided.answers ||= {};state.guided.responseRecorded ||= {};state.guided.orderIds ||= {};
  state.guided.optionOrders ||= {};
  const vitalValues=[['Frequência cardíaca','42 bpm',true],['Pressão arterial','88/54 mmHg',true],['SpO₂','96%'],['Frequência respiratória','22 irpm'],['Glasgow','15']];
  const labValues=[['Potássio','7,4 mEq/L',true],['Creatinina','4,3 mg/dL'],['Creatinina basal','2,1 mg/dL'],['Ureia','126 mg/dL'],['Sódio','134 mEq/L'],['Glicemia','108 mg/dL'],['pH venoso','7,27',true],['Bicarbonato','17 mEq/L'],['Lactato','1,4 mmol/L']];
  const drugNames={'calcium-gluconate':'Gluconato de cálcio 10%','calcium-chloride':'Cloreto de cálcio 10%','insulin':'Insulina regular + glicose','salbutamol':'Salbutamol nebulizado','potassium-removal':'Plano de remoção do potássio'};
  const stateNames={draft:'Rascunho',prescribed:'Prescrita',preparing:'Em preparo',administered:'Administrada',cancelled:'Cancelada',suspended:'Suspensa','not-administered':'Não administrada','refused-safety':'Bloqueada por segurança'};
  const learningNotes={priority:'O cálcio IV estabiliza temporariamente a membrana cardíaca e reduz o risco imediato de arritmia quando há alterações no ECG. Ele não reduz o potássio. A monitorização, o ECG e o acesso devem ocorrer sem atrasar essa proteção.',etiology:'A hipercalemia costuma ter mais de um fator. Correlacione função renal e diurese com perdas, ingestão, medicamentos e confirmação laboratorial; suspenda/reavalie fatores contribuintes segundo contexto e protocolo.',shift:'Insulina desloca potássio para dentro das células e tem efeito temporário. Associe glicose conforme glicemia e referência local; a glicemia deve ser acompanhada em série, com atenção especial à disfunção renal e hipoglicemia tardia.',monitoring:'Não use a melhora do ECG como substituto do potássio sérico. Repita ECG e potássio em intervalos adequados, monitore glicemia após insulina e acompanhe diurese, sinais vitais e risco de rebote.',removal:'Medidas de redistribuição não retiram potássio do organismo. Em oligúria/LRA ou hipercalemia grave persistente, acione equipe experiente e planeje remoção definitiva; a modalidade depende do contexto e da avaliação especializada.',disposition:'Mantenha o paciente em ambiente compatível com a instabilidade e a necessidade de monitorização. Registre responsável, destino, controles pendentes e critérios de escalonamento.'};
  function orderStatusLabel(order){if(order.drug==='potassium-removal'&&order.status==='administered')return 'Iniciada';return stateNames[order.status]||order.status;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({state,finished}));$('#save-status').textContent=accountId?'Etapa salva neste dispositivo; a tentativa final será sincronizada com sua conta.':'Etapa salva neste dispositivo; sincronização da conta não confirmada.';}catch{$('#save-status').textContent='Não foi possível salvar esta etapa neste dispositivo.';}}
  function renderClinicalData(){
    $('#vitals-grid').innerHTML=vitalValues.map(([a,b,d])=>`<div class="${d?'danger':''}"><small>${esc(a.toUpperCase())}</small><strong>${esc(b)}</strong></div>`).join('');
    $('#labs-grid').innerHTML=labValues.map(([a,b,d])=>`<div class="${d?'danger':''}"><small>${esc(a.toUpperCase())}</small><strong>${esc(b)}</strong></div>`).join('');
    $('#history-discovery').hidden=!state.flags.history;
    const latest=state.events.filter(event=>event.type==='reassessment').at(-1),box=$('#latest-assessment');
    if(!latest){box.hidden=true;box.innerHTML='';return;}
    const values=latest.values||{};
    box.hidden=false;box.innerHTML=`<span class="eyebrow">ÚLTIMA REAVALIAÇÃO · T + ${latest.atMinute} MIN</span><div class="latest-assessment-grid">${values.ecg?`<div><small>ECG</small><b>${esc(values.ecg)}</b></div>`:''}${values.potassium!=null?`<div><small>POTÁSSIO</small><b>${esc(String(values.potassium).replace('.',','))} mEq/L</b></div>`:''}${values.glucose!=null?`<div><small>GLICEMIA</small><b>${esc(String(values.glucose).replace('.',','))} mg/dL</b></div>`:''}${values.urineOutput?`<div><small>DIURESE</small><b>${esc(values.urineOutput)}</b></div>`:''}</div>`;
  }
  function activeSteps(){return Flow.STEPS.filter(step=>step.id!=='salbutamol-order'||state.guided.answers['salbutamol-choice']?.choiceId==='add');}
  function optionsFor(stepId,options){
    let order=state.guided.optionOrders[stepId];
    if(!Array.isArray(order)||order.length!==options.length||!order.every(id=>options.some(option=>option.id===id))){
      order=options.map(option=>option.id);
      for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      state.guided.optionOrders[stepId]=order;save();
    }
    return order.map(id=>options.find(option=>option.id===id)).filter(Boolean);
  }
  function currentStep(){return Flow.getStep(state.guided.step)||Flow.STEPS[0];}
  function advance(){const list=activeSteps(),i=list.findIndex(s=>s.id===state.guided.step);state.guided.step=list[Math.min(i+1,list.length-1)].id;save();render();document.querySelector('#guided-screen').scrollIntoView({behavior:'smooth',block:'nearest'});}
  function markActions(ids,detail){for(const id of ids||[])if(!state.flags[id])Engine.addAction(state,id,detail);}
  function renderTimeline(){
    const entries=[{type:'start',atMinute:0,note:'Início · avaliação, sinais vitais e exames de entrada'}].concat(state.events||[]);
    $('#timeline').innerHTML=entries.map(event=>{
      const minute=Number(event.atMinute)||0,stamp=minute===0?'INÍCIO':`T + ${minute} MIN`;
      let text=event.note;
      if(!text&&event.type==='action')text=Engine.ACTIONS.find(a=>a.id===event.id)?.label||'Ação registrada';
      if(!text&&event.type==='prescription')text=`${drugNames[event.drug]||'Ordem clínica'} · ${stateNames[event.status]||event.status}`;
      if(!text&&event.type==='medication-state')text=`${drugNames[event.drug]||'Conduta'} · ${stateNames[event.status]||event.status}`;
      if(!text&&event.type==='reassessment')text=`Reavaliação${event.values?.potassium!=null?` · K ${String(event.values.potassium).replace('.',',')} mEq/L`:''}${event.values?.glucose!=null?` · glicemia ${event.values.glucose} mg/dL`:''}${event.values?.ecg?` · ECG: ${event.values.ecg}`:''}${event.values?.urineOutput?` · diurese: ${event.values.urineOutput}`:''}`;
      return `<li><time>${stamp}</time>${esc(text||'Evento registrado')}</li>`;
    }).join('');
  }
  function renderSteps(){
    const idx=activeSteps().findIndex(s=>s.id===state.guided.step),hasStarted=idx>0||state.guided.answers.priority;
    document.querySelector('[data-step="assessment"]').classList.toggle('done',!!hasStarted);
    document.querySelector('[data-step="actions"]').classList.toggle('active',!finished&&!!hasStarted);
    document.querySelector('[data-step="report"]').classList.toggle('active',finished);
    document.querySelector('[data-step="report"]').classList.toggle('done',finished);
  }
  function render(){renderClinicalData();renderTimeline();renderSteps();renderGuided();if(finished)renderReport(Pedagogy.evaluate(state));}
  function renderGuided(){
    const step=currentStep(),list=activeSteps(),index=list.findIndex(s=>s.id===step.id),screen=$('#guided-screen');
    $('#guided-title').textContent=step.title;$('#guided-number').textContent=String(index+1).padStart(2,'0');$('#guided-total').textContent=`de ${list.length}`;
    $('#guided-progress-bar').style.width=`${Math.round(((index+1)/list.length)*100)}%`;
    const answer=state.guided.answers[step.id];
    if(step.kind==='decision'){renderDecision(step,answer);return;}
    if(step.kind==='calcium'){renderCalcium(step);return;}
    if(step.kind==='insulin'){renderInsulin(step);return;}
    if(step.kind==='salbutamol-choice'){renderSalbutamolChoice(step,answer);return;}
    if(step.kind==='salbutamol'){renderSalbutamol(step);return;}
    if(step.kind==='response'){renderResponse(step);return;}
    if(step.kind==='removal-action'){renderRemoval(step);return;}
    renderFinish(step);
  }
  function renderDecision(step,answer){
    const def=Flow.DECISIONS[step.id],screen=$('#guided-screen');
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p><div class="guided-options" role="radiogroup" aria-label="Escolha sua decisão">${optionsFor(step.id,def.options).map(option=>`<button type="button" class="guided-option ${answer?.choiceId===option.id?'is-selected':''}" data-choice="${option.id}" ${answer?'disabled':''}><span class="option-radio" aria-hidden="true"></span><span>${esc(option.label)}</span></button>`).join('')}</div>${answer?decisionFeedback(step,answer):'<button id="confirm-choice" class="button primary guided-submit" type="button" disabled>Confirmar minha escolha</button>'}`;
    if(!answer){screen.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{state.guided.selectedChoice=btn.dataset.choice;screen.querySelectorAll('[data-choice]').forEach(b=>b.classList.toggle('is-selected',b===btn));$('#confirm-choice').disabled=false;}));
      $('#confirm-choice').addEventListener('click',()=>{if(!state.guided.selectedChoice)return;const result=Flow.evaluateChoice(step.id,state.guided.selectedChoice);state.guided.answers[step.id]={choiceId:result.id,label:result.label,correct:result.correct,feedback:result.feedback,expected:result.expected,reference:result.reference};delete state.guided.selectedChoice;save();render();});}
    else $('#continue-decision').addEventListener('click',()=>{
      const result=answer.correct?Flow.evaluateChoice(step.id,answer.choiceId):Flow.evaluateChoice(step.id,def.correct);
      markActions(result.actions,answer.correct?'Decisão escolhida':'Conduta recomendada após feedback');
      if(step.id==='etiology')state.flags.history=true;
      if(step.id==='monitoring')state.guided.monitoringPlanRecorded=true;
      if(step.id==='removal')state.guided.removalPlanSelected=true;
      if(step.id==='disposition')state.phase='disposition';
      advance();
    });
  }
  function decisionFeedback(step,answer){
    const type=answer.correct?'is-positive':'is-correction';
    return `<section class="decision-feedback ${type}"><span class="eyebrow">${answer.correct?'BOA ESCOLHA':'REVISE A PRIORIDADE'}</span><p>${esc(answer.feedback)}</p>${answer.correct?'':`<p><b>Conduta indicada:</b> ${esc(answer.expected)}</p>`}<div class="feedback-learning"><b>O que aprender nesta etapa</b><p>${esc(learningNotes[step.id]||'Compare sua decisão com os dados do paciente, a sequência de atendimento e a referência indicada.')}</p></div>${answer.reference?`<a href="${Flow.DECISIONS[step.id]? 'https://guidelines.ukkidney.org/hyperkalaemia/6-summary-of-clinical-practice-guideline-for-hyperkalaemia/6-2-section-ii-hospital/':'#'}" target="_blank" rel="noreferrer">${esc(answer.reference)} ↗</a>`:''}</section><button id="continue-decision" class="button primary guided-submit" type="button">${answer.correct?'Registrar decisão e avançar':'Aplicar a orientação e avançar'} <span>→</span></button>`;
  }
  function lifecycle(orderId,labels,goNextText){
    const order=state.orders.find(o=>o.id===orderId);if(!order)return '';
    const status=order.status,progress=status==='prescribed'?1:status==='preparing'?2:status==='administered'?3:0;
    const verb=status==='administered'?(order.drug==='potassium-removal'?'Iniciada':'Administrada'):(stateNames[status]||status);
    const action=status==='prescribed'?`<button class="button primary lifecycle-button" data-order-status="preparing" data-order-id="${orderId}">Iniciar preparo <span>→</span></button>`:status==='preparing'?`<button class="button primary lifecycle-button" data-order-status="administered" data-order-id="${orderId}">${order.drug==='potassium-removal'?'Registrar início da terapia':'Registrar administração'} <span>✓</span></button>`:'';
    return `<section class="order-lifecycle"><span class="eyebrow">ACOMPANHE A ORDEM · NÃO PULE ETAPAS</span><div class="lifecycle-track">${labels.map((label,i)=>`<div class="lifecycle-step ${i<progress?'done':''} ${i===progress?'current':''}"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(label)}</span></div>`).join('')}</div><p class="lifecycle-status">Estado atual: <b>${esc(verb)}</b></p>${order.reason?`<p class="decision-feedback is-correction">${esc(order.reason)}</p>`:''}${action}${status==='administered'?`<button class="button primary guided-submit" id="go-next">${esc(goNextText)} <span>→</span></button>`:''}</section>`;
  }
  function bindLifecycle(){
    document.querySelectorAll('[data-order-status]').forEach(button=>button.addEventListener('click',()=>{const result=Engine.setOrderStatus(state,button.dataset.orderId,button.dataset.orderStatus);if(!result.accepted){$('#save-status').textContent=result.reason;return;}if(button.dataset.orderStatus==='administered'){const order=result.order;if(order.drug==='calcium-gluconate'||order.drug==='calcium-chloride')markActions(['calcium'],'Prescrição, preparo e administração registrados em sequência.');if(order.drug==='insulin')markActions(['insulin'],'Insulina administrada com glicose e prevenção de hipoglicemia.');if(order.drug==='salbutamol')markActions(['salbutamol'],'Adjuvante administrado.');if(order.drug==='potassium-removal')markActions(['removal'],'Terapia de remoção iniciada.');}save();render();}));
    $('#go-next')?.addEventListener('click',()=>advance());
  }
  function renderCalcium(step){
    const order=state.orders.find(o=>o.id===state.guided.orderIds.calcium),screen=$('#guided-screen');
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p><div class="sequence-callout"><b>Etapa em foco</b><span>Conferir a indicação → prescrever → preparar → administrar. O paciente só é marcado como tratado após você registrar cada passo.</span></div>${order?lifecycle(order.id,['Prescrita','Em preparo','Administrada'],'Reavaliar o paciente'):calciumForm()}<div id="calcium-message" aria-live="polite"></div>`;
    if(!order){$('#calcium-form').addEventListener('submit',event=>{event.preventDefault();const dose=$('#ca-dose').value,route=$('#ca-route').value,minutes=$('#ca-minutes').value;
      if(Number(dose)!==30||route!=='IV'||Number(minutes)!==10){$('#calcium-message').innerHTML='<section class="decision-feedback is-correction"><b>Confira os campos antes de liberar.</b><p>Para esta ordem de referência: gluconato de cálcio 10%, 30 mL por via IV, administrado em 10 minutos, com monitorização cardíaca.</p></section>';return;}
      const result=Engine.prescribe(state,'calcium-gluconate',{volumeMl:30,route:'IV',durationMinutes:10});if(!result.accepted){$('#calcium-message').textContent=result.reason;return;}
      state.guided.orderIds.calcium=result.order.id;save();render();
    });}else bindLifecycle();
  }
  function calciumForm(){return `<form id="calcium-form" class="guided-form"><div class="form-heading"><span class="eyebrow">PRESCRIÇÃO DO CÁLCIO</span><p>Preencha a ordem completa.</p></div><div class="guided-form-grid"><label>Medicamento<input value="Gluconato de cálcio 10%" readonly></label><label>Dose (mL)<input id="ca-dose" type="number" min="0" placeholder="Informe a dose" required></label><label>Via<select id="ca-route"><option value="">Selecione</option><option value="IV">IV</option><option value="Oral">Oral</option></select></label><label>Tempo de administração (min)<input id="ca-minutes" type="number" min="0" placeholder="Informe o tempo" required></label></div><p class="field-hint">A tela seguinte vai pedir que você inicie o preparo e confirme a administração.</p><button class="button primary guided-submit" type="submit">Conferir e prescrever <span>→</span></button></form>`;}
  function renderInsulin(step){
    const order=state.orders.find(o=>o.id===state.guided.orderIds.insulin),screen=$('#guided-screen');
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p><div class="sequence-callout warning"><b>Segurança da glicemia</b><span>Com glicemia de 108 mg/dL, inclua a proteção com glicose a 10% após a insulina e controles seriados.</span></div>${order?lifecycle(order.id,['Prescrita','Em preparo','Administrada'],'Escolher adjuvante'):insulinForm()}<div id="insulin-message" aria-live="polite"></div>`;
    if(!order){$('#insulin-form').addEventListener('submit',event=>{event.preventDefault();const dose=$('#ins-dose').value,glucose=$('#ins-glucose').value,route=$('#ins-route').value,protection=$('#d10-plan').checked;
      if(Number(dose)!==10||Number(glucose)!==25||route!=='IV'||!protection){$('#insulin-message').innerHTML='<section class="decision-feedback is-correction"><b>A prescrição ainda não pode ser liberada.</b><p>Revise: insulina regular 10 UI IV + 25 g de glicose. Como a glicemia inicial é 108 mg/dL (< 7 mmol/L), inclua glicose a 10% a 50 mL/h por 5 h e controles glicêmicos seriados.</p></section>';return;}
      const result=Engine.prescribe(state,'insulin',{dose:10,dextroseGrams:25,route:'IV',glucosePlan:true,glucoseInfusion:'Glicose 10% a 50 mL/h por 5 h'});if(!result.accepted){$('#insulin-message').textContent=result.reason;return;}
      state.guided.orderIds.insulin=result.order.id;save();render();
    });}else bindLifecycle();
  }
  function insulinForm(){return `<form id="insulin-form" class="guided-form"><div class="guided-form-grid"><label>Insulina regular (UI)<input id="ins-dose" type="number" min="0" placeholder="Informe a dose" required></label><label>Glicose associada (g)<input id="ins-glucose" type="number" min="0" placeholder="Informe a quantidade" required></label><label>Via<select id="ins-route"><option value="">Selecione</option><option value="IV">IV</option><option value="SC">SC</option></select></label><div class="guided-readonly"><b>Glicemia inicial</b><span>108 mg/dL · ~6 mmol/L</span></div></div><label class="checkline guided-check"><input id="d10-plan" type="checkbox"><span>Adicionar glicose a 10% a 50 mL/h por 5 h para prevenir hipoglicemia</span></label><p class="field-hint">Depois da prescrição, você ainda precisará iniciar o preparo e registrar que administrou.</p><button class="button primary guided-submit" type="submit">Conferir e prescrever <span>→</span></button></form>`;}
  function renderSalbutamolChoice(step,answer){
    const screen=$('#guided-screen');
    if(answer){screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p><section class="decision-feedback is-positive"><span class="eyebrow">DECISÃO REGISTRADA</span><p>${esc(answer.feedback)}</p></section><button id="continue-decision" class="button primary guided-submit" type="button">Continuar <span>→</span></button>`;$('#continue-decision').addEventListener('click',()=>{if(answer.choiceId==='add')markActions(['salbutamol'],'Adjuvante escolhido pelo aluno.');advance();});return;}
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p><div class="guided-options">${optionsFor(step.id,Flow.SALBUTAMOL_OPTIONS).map(option=>`<button type="button" class="guided-option ${state.guided.selectedChoice===option.id?'is-selected':''}" data-choice="${option.id}"><span class="option-radio"></span><span>${esc(option.label)}</span></button>`).join('')}</div><button id="confirm-choice" class="button primary guided-submit" type="button" disabled>Confirmar decisão</button>`;
    screen.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{state.guided.selectedChoice=btn.dataset.choice;screen.querySelectorAll('[data-choice]').forEach(b=>b.classList.toggle('is-selected',b===btn));$('#confirm-choice').disabled=false;}));
    $('#confirm-choice').addEventListener('click',()=>{const result=Flow.evaluateChoice(step.id,state.guided.selectedChoice);state.guided.answers[step.id]={choiceId:result.id,label:result.label,correct:true,feedback:result.feedback};delete state.guided.selectedChoice;save();render();});
  }
  function renderSalbutamol(step){
    const order=state.orders.find(o=>o.id===state.guided.orderIds.salbutamol),screen=$('#guided-screen');
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p>${order?lifecycle(order.id,['Prescrita','Em preparo','Administrada'],'Continuar para reavaliação'):salbutamolForm()}`;
    if(!order){$('#salbutamol-form').addEventListener('submit',event=>{event.preventDefault();const dose=Number($('#salb-dose').value);if(dose<10||dose>20){$('#salbutamol-message').innerHTML='<section class="decision-feedback is-correction">A faixa de referência é 10–20 mg por nebulização, como adjuvante. Confira a dose.</section>';return;}
      const made=Engine.prescribe(state,'salbutamol',{dose,route:'Nebulização'});state.guided.orderIds.salbutamol=made.order.id;save();render();});}else bindLifecycle();
  }
  function salbutamolForm(){return `<form id="salbutamol-form" class="guided-form"><div class="guided-form-grid"><label>Dose nebulizada (mg)<input id="salb-dose" type="number" min="0" placeholder="10 a 20 mg" required></label><label>Via<input value="Nebulização" readonly></label></div><p class="field-hint">O salbutamol é adjuvante. Insulina com glicose e remoção definitiva continuam necessárias.</p><button class="button primary guided-submit" type="submit">Conferir e prescrever <span>→</span></button><div id="salbutamol-message" aria-live="polite"></div></form>`;}
  function renderResponse(step){
    const screen=$('#guided-screen'),recorded=state.guided.responseRecorded[step.id];
    const response=Flow.getResponse(step.response,state);
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p>${recorded?responseCard(step,response):`<div class="sequence-callout"><b>Compare com o ECG inicial</b><span>Inicial: ondas T apiculadas, ondas P atenuadas e QRS alargado (aprox. 160 ms). Confira o ECG atual junto com potássio, glicemia e diurese antes de decidir o próximo passo.</span></div><button id="run-response" class="button primary guided-submit" type="button">Reavaliar agora <span>→</span></button>`}`;
    if(!recorded)$('#run-response').addEventListener('click',()=>{
      const values=step.response==='calcium'?{potassium:7.4,glucose:108,ecg:'QRS ~130 ms; T menos apiculadas',urineOutput:'~10 mL/h, oligúria persiste'}:step.response==='shift'?{potassium:6.6,glucose:92,ecg:'melhora parcial; alterações ainda presentes',urineOutput:'~10 mL/h, oligúria persiste'}:state.flags.definitiveRemoval?{potassium:5.8,ecg:'sem nova piora; manter vigilância',urineOutput:'oligúria persiste'}:{potassium:7.0,ecg:'risco de recorrência; manter ECG contínuo',urineOutput:'oligúria persiste'};
      Engine.advanceTo(state,step.time);Engine.recordReassessment(state,values);state.guided.responseRecorded[step.id]=true;
      if(!state.flags.reassessment)Engine.addAction(state,'reassessment','Reavaliação seriada em etapas programadas.');
      if(step.response==='shift'&&!state.flags['glucose-series'])Engine.addAction(state,'glucose-series','Controles seriados de glicemia após insulina.');
      save();render();
    });
    else $('#continue-response').addEventListener('click',()=>advance());
  }
  function responseCard(step,response){return `<section class="response-card"><span class="eyebrow">${esc(response.title)} · RESULTADO DO CENÁRIO</span><div class="ecg-comparison"><b>ECG inicial</b><span>Ondas T apiculadas · ondas P atenuadas · QRS alargado (~160 ms)</span><b>ECG nesta reavaliação</b><span>${esc(response.rows.find(([label])=>label==='ECG')?.[1]||'Não registrado')}</span></div><div class="response-grid">${response.rows.filter(([label])=>label!=='ECG').map(([label,value])=>`<div><small>${esc(label.toUpperCase())}</small><b>${esc(value||'')}</b></div>`).join('')}</div><p class="feedback-learning"><b>Interpretação</b><span>Compare o traçado com o inicial e interprete-o junto aos exames e à evolução clínica. Uma melhora parcial do ECG não comprova normalização do potássio nem elimina risco de recorrência.</span></p><p class="field-hint">Valores simulados e pré-programados para este caso; não representam uma resposta universal nem uma previsão individual.</p></section><button id="continue-response" class="button primary guided-submit" type="button">Ver próxima etapa <span>→</span></button>`;}
  function renderRemoval(step){
    const screen=$('#guided-screen'),order=state.orders.find(o=>o.id===state.guided.orderIds.removal);
    let first=`<section class="removal-task"><span class="eyebrow">ETAPA 1 · SOLICITAR PARECER</span><h3>Passe o caso à nefrologia</h3><p>Escreva uma solicitação objetiva. Considere incluir estes pontos:</p><ul class="consult-prompts"><li><b>Hipercalemia grave ou refratária:</b> K 7,4 mEq/L, alterações no ECG e resposta aos tratamentos temporários já realizados.</li><li><b>Lesão renal aguda sobre DRC com oligúria:</b> creatinina 4,3 mg/dL (basal 2,1) e diurese reduzida, limitando a eliminação do potássio.</li><li><b>Acidose metabólica:</b> pH 7,27 e bicarbonato 17 mEq/L.</li><li><b>Hipervolemia refratária, se presente:</b> descrever sinais de congestão, resposta ao tratamento e balanço hídrico; não presumir esse achado sem dados clínicos.</li><li><b>Pedido claro:</b> avaliação urgente da necessidade, modalidade e momento de terapia de remoção definitiva.</li></ul>${state.guided.nephrologyCalled?`<div class="consult-request-sent"><b>Parecer solicitado e registrado</b><p>${esc(state.guided.nephrologyRequest||'')}</p></div>`:`<label class="consult-request-label" for="nephrology-request">Mensagem para a equipe</label><textarea id="nephrology-request" rows="6" placeholder="Resuma o quadro, as alterações do ECG, os exames, a diurese e as medidas já administradas. Finalize com o parecer que está solicitando.">${esc(state.guided.nephrologyRequest||'')}</textarea><p class="field-hint">Confira se o texto informa potássio, função renal/diurese, ECG, medidas já feitas e motivo do pedido.</p><button id="call-nephrology" class="button primary" type="button" ${state.guided.nephrologyRequest?.trim()?'':'disabled'}>Registrar solicitação de parecer <span>→</span></button>`}</section>`;
    let second=order?lifecycle(order.id,['Solicitada','Em preparo','Iniciada'],'Reavaliar após remoção'):`<section class="removal-task"><span class="eyebrow">ETAPA 2 · PLANEJAR REMOÇÃO DEFINITIVA</span><p>Com oligúria e LRA, registre a preparação para terapia renal substitutiva conforme avaliação especializada.</p><button id="request-removal" class="button primary" type="button" ${state.guided.nephrologyCalled?'':'disabled'}>Solicitar terapia de remoção <span>→</span></button></section>`;
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p>${first}${second}<div class="decision-feedback is-correction"><p>O shift com insulina e salbutamol é temporário; não substitui a remoção do potássio corporal.</p></div>`;
    $('#nephrology-request')?.addEventListener('input',event=>{state.guided.nephrologyRequest=event.target.value;$('#call-nephrology').disabled=!event.target.value.trim();save();});
    $('#call-nephrology')?.addEventListener('click',()=>{if(!state.guided.nephrologyRequest?.trim())return;state.guided.nephrologyCalled=true;markActions(['nephrology'],'Solicitação de parecer registrada: '+state.guided.nephrologyRequest.trim());save();render();});
    $('#request-removal')?.addEventListener('click',()=>{const made=Engine.prescribe(state,'potassium-removal',{route:'Terapia renal substitutiva',details:'Avaliação nefrológica urgente'});state.guided.orderIds.removal=made.order.id;state.guided.removalRequested=true;markActions(['removal'],'Plano de remoção solicitado, aguardando preparo e início.');save();render();});
    if(order)bindLifecycle();
  }
  function renderFinish(step){
    const screen=$('#guided-screen'),results=Object.values(state.guided.answers),correct=results.filter(item=>item.correct).length;
    screen.innerHTML=`<p class="guided-prompt">${esc(step.prompt)}</p><div class="sequence-callout"><b>Resumo do percurso</b><span>${state.actions.length} ações registradas · ${state.orders.length} ordens · ${correct}/${results.length} decisões iniciais alinhadas às opções de referência.</span></div><p class="muted">As escolhas e as correções feitas durante a sequência ficarão no relatório. A pontuação é educativa e não mede competência clínica.</p><button id="finish-encounter" class="button primary guided-submit" type="button">Encerrar tentativa e gerar relatório <span>✓</span></button>`;
    $('#finish-encounter').addEventListener('click',()=>{finished=true;state.guided.step='finish';state.phase='completed';save();render();$('#final-report').scrollIntoView({behavior:'smooth',block:'start'});});
  }
  function renderReport(result){
    const box=$('#final-report');box.classList.remove('hidden');
    const decisions=Object.entries(state.guided.answers).map(([id,answer])=>`<li><b>${esc(Flow.getStep(id)?.title||id)}:</b> ${esc(answer.label)} · ${answer.correct?'Adequada':'Orientada para revisão'}<p>${esc(answer.feedback)}</p>${answer.expected?`<p><b>Conduta indicada:</b> ${esc(answer.expected)}</p>`:''}</li>`).join('');
    const syncLabel=state.guided.reportSynced?'Tentativa e pontos de revisão sincronizados com sua conta.':state.guided.reportSyncError||'Sincronizando tentativa e pontos de revisão com sua conta…';
    box.innerHTML=`<span class="eyebrow">TENTATIVA REGISTRADA · ${new Date().toLocaleString('pt-BR')}</span><h2>Relatório do atendimento</h2><div class="report-score"><strong>${result.score}/100</strong><p>${esc(result.summary)}<br>${result.passed?'Critérios de referência atingidos nesta prévia.':'A revisão identifica pontos para retomar.'}</p></div><div class="domain-results">${result.domains.map(d=>`<div class="domain-result"><b>${esc(d.label)}</b><span>${d.score} / ${d.max}</span></div>`).join('')}</div>${result.critical.length?`<div class="report-critical"><b>Pontos de segurança a revisar</b><ul>${result.critical.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>`:'<p class="muted">Nenhuma omissão crítica foi identificada pelas regras preliminares desta atividade.</p>'}<h3>Decisões e feedback</h3><ul>${decisions||'<li>Nenhuma decisão registrada.</li>'}</ul>${state.guided.nephrologyRequest?`<h3>Solicitação de parecer à nefrologia</h3><blockquote class="consult-report">${esc(state.guided.nephrologyRequest)}</blockquote>`:''}<h3>Prescrições e estados</h3><ul>${state.orders.map(order=>`<li>${esc(drugNames[order.drug]||'Conduta clínica')} · ${esc(orderStatusLabel(order))}${order.reason?` · ${esc(order.reason)}`:''}</li>`).join('')||'<li>Nenhuma prescrição.</li>'}</ul><h3>Eventos e reavaliações</h3><ul>${state.events.filter(event=>event.type==='reassessment').map(event=>`<li>T + ${event.atMinute} min · K ${event.values.potassium??'—'} mEq/L · glicemia ${event.values.glucose??'—'} mg/dL · ${esc(event.values.ecg||'ECG não registrado')} · diurese ${esc(event.values.urineOutput||'não informada')}</li>`).join('')||'<li>Nenhuma reavaliação.</li>'}</ul><p class="muted">Resultados clínicos são pré-programados para este cenário. A pontuação é educativa, não mede competência clínica. ${esc(syncLabel)}</p>${state.guided.reportSyncError?'<button class="button secondary" id="retry-sync" type="button">Tentar sincronizar novamente</button>':''}<div class="report-actions"><button class="button secondary" id="edit-report" type="button">Voltar às etapas</button><button class="button secondary" id="new-after-report" type="button">Iniciar nova tentativa</button><button class="button primary" id="finish-attempt" type="button">Finalizar tentativa <span>→</span></button></div>`;
    $('#edit-report').addEventListener('click',()=>{finished=false;save();render();window.scrollTo({top:0,behavior:'smooth'});});
    $('#new-after-report').addEventListener('click',()=>newAttempt());
    $('#finish-attempt').addEventListener('click',async()=>{if(!state.guided.reportSynced){await syncReport(Pedagogy.evaluate(state),true);if(!state.guided.reportSynced)return;}const next=new URL('agoraatenda02.html',location.href);try{const response=await fetch(next,{method:'HEAD'});location.href=response.ok?next.href:'curso.html?id=fa3c5d8d-94c4-4321-be7a-1cc45741a983';}catch{location.href='curso.html?id=fa3c5d8d-94c4-4321-be7a-1cc45741a983';}});
    syncReport(result);
    $('#retry-sync')?.addEventListener('click',()=>syncReport(result,true));
  }
  async function syncReport(result,force=false){
    if(state.guided.reportSynced||state.guided.reportSyncBusy||(!force&&state.guided.reportSyncFailed))return;
    if(!accountId&&force){try{const meta=await fetch('/api/agoraatenda01?meta=1',{credentials:'same-origin',cache:'no-store'});const account=await meta.json();if(meta.ok&&account.ok&&account.usuarioId){accountId=account.usuarioId;KEY=KEY.replace(/:unlinked$/,`:${accountId}`);HISTORY=HISTORY.replace(/:unlinked$/,`:${accountId}`);ERROR_NOTEBOOK=ERROR_NOTEBOOK.replace(/:unlinked$/,`:${accountId}`);}}catch{}}
    if(!accountId){state.guided.reportSyncError='Entre na sua conta para sincronizar esta tentativa com o Caderno de Erros.';state.guided.reportSyncFailed=true;save();renderReport(result);return;}
    state.guided.reportSyncBusy=true;state.guided.reportSyncError='Sincronizando tentativa e pontos de revisão com sua conta…';
    if(!state.guided.attemptOperationId)state.guided.attemptOperationId=crypto.randomUUID();
    save();
    try{const response=await fetch('/api/agoraatenda01',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({operationId:state.guided.attemptOperationId,state})});const payload=await response.json();if(!response.ok||!payload.ok)throw new Error(payload.erro||'Não foi possível sincronizar.');
      state.guided.reportSynced=true;state.guided.reportSyncFailed=false;state.guided.reportSyncError='';state.guided.attemptId=payload.attemptId;state.guided.reportStored=true;
      const attempts=history();if(!attempts.some(item=>item.operationId===state.guided.attemptOperationId)){attempts.push({operationId:state.guided.attemptOperationId,attemptId:payload.attemptId,finishedAt:new Date().toISOString(),score:result.score,actions:state.actions,orders:state.orders,events:state.events,answers:state.guided.answers,nephrologyRequest:state.guided.nephrologyRequest||null});localStorage.setItem(HISTORY,JSON.stringify(attempts));}
    }catch(error){state.guided.reportSyncError=error.message||'Não foi possível sincronizar. Tente novamente.';state.guided.reportSyncFailed=true;}
    finally{state.guided.reportSyncBusy=false;save();renderReport(result);}
  }
  function newAttempt(){state=Engine.createState();state.guided={step:'priority',answers:{},responseRecorded:{},orderIds:{},optionOrders:{},nephrologyCalled:false,removalRequested:false};finished=false;$('#final-report').classList.add('hidden');save();render();window.scrollTo({top:0,behavior:'smooth'});}
  $('#reset-attempt').addEventListener('click',()=>{if(!confirm('Começar uma nova tentativa? Os relatórios finalizados permanecem no histórico deste navegador.'))return;newAttempt();});
  async function initialize(){try{const response=await fetch('/api/agoraatenda01?meta=1',{credentials:'same-origin',cache:'no-store'}),payload=await response.json();if(response.ok&&payload.ok&&payload.usuarioId){accountId=payload.usuarioId;KEY+=`:${accountId}`;HISTORY+=`:${accountId}`;ERROR_NOTEBOOK+=`:${accountId}`;}}catch{}restore();render();if(finished)$('#final-report').scrollIntoView({block:'start'});}
  initialize();
})();
