/* Questões comentadas dentro da videoaula; estado e correção pertencem ao servidor. */
window.QuizAula=(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function inline(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
 function prose(s){return String(s||'').split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+inline(p).replace(/\n/g,'<br>')+'</p>').join('');}
 async function montar(root,aulaId){
  if(!root||root.dataset.loaded)return;root.dataset.loaded='1';root.hidden=false;
  let content,state=null,revision=0,busy=false,pending=null,started=false;
  root.innerHTML='<p role="status">Carregando questões comentadas…</p>';
  async function request(method='GET',body,query=''){
   const res=await fetch('/api/quiz-aula'+(method==='GET'?'?aula_id='+encodeURIComponent(aulaId)+query:''),{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
   const data=await res.json();if(!res.ok||!data.ok){const e=new Error(data.erro||'Não foi possível carregar ou salvar as questões.');e.status=res.status;throw e;}return data;
  }
  function apply(data){content=data.content;state=data.state;revision=data.revision;}
  function error(e){const box=root.querySelector('.qa-error');box.hidden=false;box.innerHTML='<p>'+esc(e.message)+'</p><div class="qa-actions">'+(pending?'<button type="button" class="qa-primary" data-qa="retry">Tentar salvar novamente</button>':'')+'<button type="button" class="qa-ghost" data-qa="reload">Carregar versão atual</button></div>';}
  async function act(action,extra={}){
   if(busy||pending&&action)return;
   if(action)pending={aula_id:aulaId,action,operation:crypto.randomUUID(),attempt:state?.id||null,previous:state?.id||null,revision,...extra};
   busy=true;root.querySelector('.qa-body').inert=true;
   try{const actionName=pending.action;const data=await request('POST',pending);apply(data);pending=null;started=true;render();if(actionName==='draft')root.querySelector('input:checked')?.focus({preventScroll:true});else focus();}
   catch(e){if(e.status===400)pending=null;error(e);}
   finally{busy=false;root.querySelector('.qa-body').inert=false;}
  }
  function focus(){const el=root.querySelector('[data-qa-focus]');if(el){el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:'instant'});}}
  function comment(q,a){return '<section class="qa-feedback '+(a.correct?'':'qa-wrong')+'" tabindex="-1" data-qa-focus><p class="qa-kicker">SUA ESCOLHA: '+esc(a.choice)+'</p><h4>'+(a.correct?'✓ Você acertou':'Vamos revisar este ponto')+'</h4><div class="qa-prose">'+prose(q.feedback)+'</div>'+(!a.correct?'<details class="qa-explanation" open><summary>Entenda a resposta correta</summary><p><strong>Alternativa '+esc(q.correctChoice)+'.</strong> '+esc(q.choices[q.correctChoice])+'</p>'+prose(q.correctExplanation)+'</details>':'')+'<div class="qa-takeaway"><strong>PARA GUARDAR</strong><p>'+esc(q.message)+'</p></div></section>';}
  function intro(){return '<div class="qa-intro"><span class="qa-label">5 questões comentadas</span><h3 data-qa-focus tabindex="-1">Coma não perceptivo e resposta motora</h3><p>Use os casos para revisar o raciocínio apresentado na aula. Você pode consultar o vídeo e os materiais a qualquer momento.</p><div class="qa-actions"><button type="button" class="qa-primary" data-qa="start">'+(state?(state.finishedAt?'Ver meu resultado':'Retomar questões'):'Responder questões')+' <span aria-hidden="true">→</span></button><button type="button" class="qa-ghost" data-qa="history">Minhas tentativas</button></div><p class="qa-muted">Atividade formativa, sem nota mínima. A conclusão da videoaula continua independente.</p></div>';}
  function result(){const total=content.questions.length;return '<div class="qa-result"><p class="qa-kicker">QUESTÕES CONCLUÍDAS</p><h3 data-qa-focus tabindex="-1">Um passo a mais no seu raciocínio.</h3><div class="qa-score"><strong>'+state.score+'<small>/'+total+'</small></strong><p>'+Math.round(state.score/total*100)+'% de acertos nesta tentativa.<br>Revise os comentários para consolidar o aprendizado.</p></div><div class="qa-review">'+content.questions.map((q,i)=>'<details><summary><span>'+q.number+'. '+esc(q.title)+'</span><span class="qa-label">'+(state.answers[i].correct?'Acertou':'Revisar')+'</span></summary><p>Sua alternativa: <strong>'+esc(state.answers[i].choice)+'</strong> · '+esc(q.choices[state.answers[i].choice])+'</p>'+comment(q,state.answers[i])+'</details>').join('')+'</div><div class="qa-actions"><button type="button" class="qa-primary" data-qa="restart">Realizar nova tentativa</button><button type="button" class="qa-ghost" data-qa="history">Minhas tentativas</button><a class="qa-ghost" href="#palco">Voltar ao vídeo ↑</a></div><p class="qa-muted">'+esc(content.references)+'</p></div>';}
  function question(){const n=state.answers.length&&!state.answers.at(-1).read?state.answers.length-1:state.answers.length;if(n===content.questions.length)return result();const q=content.questions[n],a=state.answers[n];return '<div class="qa-progress"><span>QUESTÃO '+(n+1)+' DE '+content.questions.length+'</span><span>'+state.answers.filter(x=>x.read).length+' revisadas</span></div><div class="qa-segments" aria-hidden="true">'+content.questions.map((_,i)=>'<span class="'+(i<n?'done':i===n?'current':'')+'"></span>').join('')+'</div><h3 '+(!a?'data-qa-focus tabindex="-1"':'')+'>'+esc(q.title)+'</h3><div class="qa-prose" id="qa-stem">'+prose(q.stem)+'</div><fieldset class="qa-options" aria-labelledby="qa-stem" '+(a?'disabled':'')+'>'+Object.entries(q.choices).map(([k,v])=>'<label><input type="radio" name="qa-answer" value="'+k+'" '+((a?.choice||state.draft)===k?'checked':'')+'><span class="qa-letter">'+k+'</span><span>'+esc(v)+'</span></label>').join('')+'</fieldset>'+(a?comment(q,a)+'<div class="qa-actions"><button type="button" class="qa-primary" data-qa="read">'+(n===content.questions.length-1?'Ver meu resultado':'Li o comentário — próxima questão')+' →</button><a class="qa-ghost" href="#palco">Consultar o vídeo ↑</a></div>':'<div class="qa-actions"><button type="button" class="qa-primary" data-qa="confirm" '+(!state.draft?'disabled':'')+'>Confirmar resposta →</button></div>');}
  function render(){root.innerHTML='<header class="qa-header"><div><p class="qa-kicker">AGORAQUIZ</p><h2>Coloque seu raciocínio <em>em prática.</em></h2></div><span class="qa-label">Na própria aula</span></header><div class="qa-error" role="alert" hidden></div><div class="qa-body">'+(!started?intro():question())+'</div><div class="qa-history" hidden><div class="qa-history-head"><h3>Minhas tentativas</h3><button type="button" class="qa-ghost" data-qa="close-history">Fechar</button></div><div class="qa-history-content"></div></div>';}
  async function history(){const area=root.querySelector('.qa-history'),body=area.querySelector('.qa-history-content');area.hidden=false;body.textContent='Carregando tentativas…';area.scrollIntoView({block:'start'});let offset=0;
   const load=async()=>{try{const data=await request('GET',null,'&historico=1&offset='+offset),html=data.history.map(s=>'<article><strong>'+esc(new Date(s.startedAt).toLocaleString('pt-BR'))+'</strong><p>'+(s.finishedAt?'Concluída':'Em andamento ou interrompida')+' · '+s.answers.length+'/5 respostas · '+s.score+' acertos</p></article>').join('');if(!offset)body.innerHTML=html||'<p>Nenhuma tentativa iniciada.</p>';else{body.querySelector('[data-qa="more-history"]')?.remove();body.insertAdjacentHTML('beforeend',html);}if(data.more){body.insertAdjacentHTML('beforeend','<button type="button" class="qa-ghost" data-qa="more-history">Ver anteriores</button>');body.querySelector('[data-qa="more-history"]').onclick=()=>{offset+=25;load();};}}catch(e){body.textContent=e.message;}};await load();
  }
  root.addEventListener('change',e=>{if(e.target.matches('[name="qa-answer"]'))act('draft',{choice:e.target.value});});
  root.addEventListener('click',async e=>{const b=e.target.closest('[data-qa]');if(!b||busy)return;const action=b.dataset.qa;
   if(action==='retry')return act();
   if(action==='reload'){try{apply(await request());pending=null;render();}catch(err){error(err);}return;}
   if(action==='start'){if(state){started=true;render();focus();}else await act('start');}
   else if(action==='restart'){if(await UI.confirmar('Realizar uma nova tentativa? As anteriores continuarão salvas.'))await act('start');}
   else if(action==='confirm'||action==='read')await act(action);
   else if(action==='history')await history();else if(action==='close-history')root.querySelector('.qa-history').hidden=true;
  });
  window.addEventListener('beforeunload',e=>{if(pending){e.preventDefault();e.returnValue='';}});
  try{apply(await request());render();}catch(e){root.innerHTML='<header class="qa-header"><h2>Questões comentadas</h2></header><div class="qa-error" role="alert"></div><div class="qa-body"></div>';error(e);}
 }
 return {montar};
})();
