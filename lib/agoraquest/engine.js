/* Transições puras do AgoraQuest; sem DOM ou rede. */
(function(root){
'use strict';
const LETTERS=['A','B','C','D'],KEY=['B','C','B','D','C'],TOTAL=KEY.length;
function fresh(){return {version:1,id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now()),startedAt:new Date().toISOString(),answers:[],draft:null,finishedAt:null};}
function valid(s){
  return !!s&&s.version===1&&typeof s.id==='string'&&typeof s.startedAt==='string'&&Array.isArray(s.answers)&&s.answers.length<=TOTAL&&
    s.answers.every((a,i)=>a&&LETTERS.includes(a.choice)&&typeof a.seen==='boolean'&&typeof a.confirmedAt==='string'&&(i===s.answers.length-1||a.seen))&&
    (s.draft===null||LETTERS.includes(s.draft))&&(!s.finishedAt||(s.answers.length===TOTAL&&s.answers.every(a=>a.seen)));
}
function index(s){return s.answers.length&&!s.answers[s.answers.length-1].seen?s.answers.length-1:s.answers.length;}
function select(s,choice){
  if(!LETTERS.includes(choice)||index(s)!==s.answers.length||s.answers.length===TOTAL)throw Error('Seleção indisponível.');
  return {...s,draft:choice};
}
function confirm(s){
  if(!s.draft||index(s)!==s.answers.length||s.answers.length===TOTAL)throw Error('Escolha uma alternativa antes de confirmar.');
  return {...s,draft:null,answers:[...s.answers,{choice:s.draft,seen:false,confirmedAt:new Date().toISOString()}]};
}
function acknowledge(s){
  if(!s.answers.length||s.answers[s.answers.length-1].seen)throw Error('Não há comentário aguardando avanço.');
  return {...s,answers:s.answers.map((a,i)=>i===s.answers.length-1?{...a,seen:true,seenAt:new Date().toISOString()}:a)};
}
function finish(s){
  if(s.answers.length!==TOTAL||!s.answers.every(a=>a.seen))throw Error('Conclua as cinco questões antes de ver o resultado.');
  return {...s,finishedAt:s.finishedAt||new Date().toISOString()};
}
function next(s){
  const n=acknowledge(s);
  return n.answers.length===TOTAL&&n.answers.every(a=>a.seen)?finish(n):n;
}
function score(s){return s.answers.reduce((n,a,i)=>n+(a.choice===KEY[i]?1:0),0);}
const api={LETTERS,KEY,TOTAL,fresh,valid,index,select,confirm,acknowledge,next,finish,score};
if(typeof module!=='undefined')module.exports=api;else root.AgoraQuestEngine=api;
})(typeof window!=='undefined'?window:this);
