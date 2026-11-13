'use strict';
const E=require('./engine');
const N=require('./caderno');
const CONTEUDOS=[require('./hipercalemia-aula-01-v1.json'),require('./hipercalemia-aula-02-v1.json'),require('./hipercalemia-aula-03-v1.json'),require('./hipercalemia-aula-04-v1.json'),require('./hipercalemia-aula-05-v1.json'),require('./hipercalemia-aula-06-v1.json'),require('./hipercalemia-aula-07-v1.json')];
const POR_SLUG=new Map(CONTEUDOS.map(c=>[c.slug,c]));

function porSlug(slug){return typeof slug==='string'?POR_SLUG.get(slug)||null:null;}
function keyOf(c){return E.key(c&&c.key);}
function publicState(s,c){
  if(!s)return null;
  const chave=keyOf(c);
  return {...s,answers:s.answers.map((a,i)=>({...a,correct:a.choice===chave[i]})),score:E.score(s,chave)};
}
function visible(s,conteudo){
  const c=conteudo||CONTEUDOS[0];
  const chave=keyOf(c);
  return {
    slug:c.slug,
    versao:c.versao,
    title:c.title,
    subtitle:c.subtitle,
    intro:c.intro,
    references:c.references,
    ...(s&&s.finishedAt?{closing:c.closing}:{}),
    questions:c.questions.map((q,i)=>{
      const a=s&&s.answers[i];
      return {
        number:q.number,
        questionId:N.questaoId(c.slug,q.number),
        title:q.title,
        ...(q.competency?{competency:q.competency}:{}),
        stem:q.stem,
        ...(q.table?{table:q.table}:{}),
        ...(q.stemAfter?{stemAfter:q.stemAfter}:{}),
        choices:q.choices,
        ...(a?{
          feedback:q.feedback,
          correctChoice:chave[i],
          correctExplanation:q.correctExplanation,
          pearl:q.pearl,
          reference:q.reference||c.references
        }:{})
      };
    })
  };
}
function transition(s,action,body,conteudo){
  const c=conteudo||CONTEUDOS[0];
  const chave=keyOf(c);
  if(!E.valid(s,chave))throw Error('Tentativa indisponível.');
  if(s.finishedAt)throw Error('Esta tentativa já foi concluída.');
  if(action==='draft')return E.select(s,body&&body.choice,chave);
  if(action==='confirm')return E.confirm(s,chave);
  if(action==='answer')return E.confirm(E.select(s,body&&body.choice,chave),chave);
  if(action==='next')return E.next(s,chave);
  if(action==='finish')return E.finish(s,chave);
  throw Error('Ação inválida.');
}
module.exports={E,N,CONTEUDOS,content:CONTEUDOS[0],porSlug,keyOf,publicState,visible,transition};
