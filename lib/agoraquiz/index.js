'use strict';
const E=require('./engine');
const content=require('./pre-requisitos-v1.json');
const VERSION=1,SLUG='pre-requisitos-v1';
function publicState(s){return {...s,answers:s.answers.map((a,i)=>({...a,correct:a.choice===E.KEY[i]})),score:E.score(s)};}
function visible(s){
 const done=s&&E.index(s)===11;
 return {title:content.title,intro:content.intro,case:content.case,questions:content.questions.map((q,i)=>({number:q.number,title:q.title,stem:q.stem,choices:q.choices,...(s?.answers[i]?{feedback:{[s.answers[i].choice]:q.feedback[s.answers[i].choice]},message:q.message,extra:q.extra}:{} )})),...(done?{closing:content.closing,references:content.references}:{})};
}
function transition(s,action,body){
 if(!E.valid(s))throw Error('Tentativa indisponível.');
 if(action==='draft')return E.select(s,body.choice);
 if(action==='confirm')return E.confirm(s);
 if(action==='read')return E.acknowledge(s);
 if(action==='finish')return E.finish(s);
 throw Error('Ação inválida.');
}
module.exports={E,VERSION,SLUG,content,publicState,visible,transition};
