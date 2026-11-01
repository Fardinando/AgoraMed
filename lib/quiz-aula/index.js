'use strict';
const E=require('./engine'),content=require('./exame-clinico-v1.json');
const VERSION=1,LESSON_ID='6a095878-7bc7-4316-9f90-c317efb27406';
function publicState(s){return {...s,answers:s.answers.map((a,i)=>({...a,correct:a.choice===E.KEY[i]})),score:E.score(s)};}
function visible(s){return {title:content.title,subtitle:content.subtitle,references:content.references,questions:content.questions.map((q,i)=>({number:q.number,title:q.title,stem:q.stem,choices:q.choices,...(s?.answers[i]?{feedback:q.feedback[s.answers[i].choice],correctChoice:E.KEY[i],correctExplanation:q.correctExplanation,message:q.message}:{} )}))};}
function transition(s,action,b){if(!E.valid(s))throw Error('Tentativa indisponível.');if(s.finishedAt)throw Error('Esta tentativa já foi concluída.');if(action==='draft')return E.select(s,b.choice);if(action==='confirm')return E.confirm(s);if(action==='read'){const n=E.acknowledge(s);return n.answers.length===5&&n.answers.every(a=>a.read)?E.finish(n):n;}if(action==='finish')return E.finish(s);throw Error('Ação inválida.');}
module.exports={E,VERSION,LESSON_ID,content,publicState,visible,transition};
