/* Pure state transitions; no DOM or network. */
(function(root){
'use strict';
const KEY=['B','C','A','C','B','C','B','A','D','B','D'];
function fresh(){return {version:1,id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now()),startedAt:new Date().toISOString(),answers:[],draft:null,finishedAt:null};}
function valid(s){return !!s&&s.version===1&&typeof s.id==='string'&&typeof s.startedAt==='string'&&Array.isArray(s.answers)&&s.answers.length<=11&&s.answers.every((a,i)=>a&&KEY.includes(a.choice)&&typeof a.read==='boolean'&&typeof a.confirmedAt==='string'&&(i===s.answers.length-1||a.read))&&(s.draft===null||KEY.includes(s.draft))&&(!s.finishedAt||(s.answers.length===11&&s.answers.every(a=>a.read)));}
function index(s){return s.answers.length&& !s.answers[s.answers.length-1].read?s.answers.length-1:s.answers.length;}
function select(s,choice){if(!KEY.includes(choice)||index(s)!==s.answers.length||s.answers.length===11)throw Error('Seleção indisponível.');return {...s,draft:choice};}
function confirm(s){if(!s.draft||index(s)!==s.answers.length||s.answers.length===11)throw Error('Escolha uma alternativa antes de confirmar.');return {...s,draft:null,answers:[...s.answers,{choice:s.draft,read:false,confirmedAt:new Date().toISOString()}]};}
function acknowledge(s){if(!s.answers.length||s.answers[s.answers.length-1].read)throw Error('Não há comentário aguardando confirmação.');return {...s,answers:s.answers.map((a,i)=>i===s.answers.length-1?{...a,read:true,readAt:new Date().toISOString()}:a)};}
function finish(s){if(s.answers.length!==11||!s.answers.every(a=>a.read))throw Error('Conclua as questões e confirme a leitura antes de concluir.');return {...s,finishedAt:s.finishedAt||new Date().toISOString()};}
function score(s){return s.answers.reduce((n,a,i)=>n+(a.choice===KEY[i]?1:0),0);}
const api={KEY,fresh,valid,index,select,confirm,acknowledge,finish,score};
if(typeof module!=='undefined')module.exports=api;else root.ActivityEngine=api;
})(typeof window!=='undefined'?window:this);
