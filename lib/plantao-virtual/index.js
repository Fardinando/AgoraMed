'use strict';
const E=require('../../js/plantao-engine');
const content=require('./case');
const SLUG='plantao-pos-parada-v1',VERSION=1;
const clone=x=>JSON.parse(JSON.stringify(x));
function stepIndex(s,b){const i=b.step;if(!Number.isInteger(i)||i<0||i>8||i>E.unlocked(s))throw Error('Etapa indisponível.');return i;}
function draftValue(v,i){
 if(!v||typeof v!=='object'||!['','adequado','pendente','insuficiente'].includes(v.status)||typeof v.reason!=='string'||v.reason&&!content.steps[i].reasons.some(r=>r[0]===v.reason)||!Array.isArray(v.evidence)||v.evidence.length>10||new Set(v.evidence).size!==v.evidence.length||v.evidence.some(id=>!content.steps[i].docs.includes(id))||typeof v.note!=='string'||v.note.length>1800)throw Error('Avaliação inválida.');
 return {status:v.status,reason:v.reason,evidence:v.evidence,note:v.note};
}
function transition(s,action,b={}){
 if(!E.valid(s,content))throw Error('Tentativa indisponível.');
 let n=clone(s);
 if(action==='view'){
  if(b.screen==='entry'){n.resumeScreen=n.screen==='entry'?n.resumeScreen:n.screen;n.screen='entry';}
  else if(b.screen==='room'){n.step=stepIndex(s,b);n.screen='room';}
  else if(b.screen==='resume'){n.screen=s.finishedAt?'report':s.resumeScreen&&s.resumeScreen!=='entry'?s.resumeScreen:E.unlocked(s)===9?'final':'room';}
  else if(b.screen==='final'){if(E.unlocked(s)!==9)throw Error('Conclua as nove etapas.');n.screen=s.finishedAt?'report':'final';}
  else if(b.screen==='report'){if(!s.finishedAt)throw Error('Conclua o fechamento.');n.screen='report';}
  else throw Error('Tela inválida.');return n;
 }
 if(action==='visit')return E.visit(s,b.document,content);
 if(action==='help'){
  const i=stepIndex(s,b);if(!['support-panel','hint1','hint2','hint3','lesson','material','timeline'].includes(b.kind))throw Error('Apoio inválido.');
  if(b.kind.startsWith('hint')){const count=s.support.filter(h=>h.step===i&&h.type.startsWith('hint')).length;if(count>=3||b.kind!=='hint'+(count+1))throw Error('Pista indisponível.');}
  if(s.support.length>=3000)throw Error('Limite de registros de apoio atingido.');
  return E.help(s,i,b.kind);
 }
 if(action==='draft'||action==='submit'){
  const i=stepIndex(s,b);n=E.draft(s,i,draftValue(b.draft,i));
  if(action==='submit'){n=E.submit(n,i,content);n.screen='room';}return n;
 }
 if(action==='advance'){if(s.finishedAt)throw Error('Tentativa concluída.');return E.acknowledge(s,stepIndex(s,b));}
 if(action==='final'){
  if(s.finishedAt)throw Error('Tentativa concluída.');const v=b.draft;
  if(!v||typeof v.note!=='string'||v.note.length>2000)throw Error('Decisão inválida.');
  n.finalDraft={decision:v.decision,pending:v.pending,note:v.note};n=E.assessFinal(n,content);n.screen='final';return n;
 }
 if(action==='revise-final'){if(s.finishedAt)throw Error('Tentativa concluída.');n.final=null;return n;}
 if(action==='finish'){if(E.unlocked(s)!==9)throw Error('Conclua as nove etapas.');return E.finish(s);}
 throw Error('Ação inválida.');
}
module.exports={E,SLUG,VERSION,content,transition,publicState:clone,visible:()=>content};
