'use strict';
const E=require('./engine');
const CONTEUDOS=[require('./hipercalemia-aula-01-v1.json')];
const POR_SLUG=new Map(CONTEUDOS.map(c=>[c.slug,c]));

function porSlug(slug){return typeof slug==='string'?POR_SLUG.get(slug)||null:null;}
function publicState(s){
  if(!s)return null;
  return {...s,answers:s.answers.map((a,i)=>({...a,correct:a.choice===E.KEY[i]})),score:E.score(s)};
}
function visible(s,conteudo){
  const c=conteudo||CONTEUDOS[0];
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
        title:q.title,
        stem:q.stem,
        choices:q.choices,
        ...(a?{
          feedback:q.feedback,
          correctChoice:E.KEY[i],
          correctExplanation:q.correctExplanation,
          pearl:q.pearl
        }:{})
      };
    })
  };
}
function transition(s,action,body){
  if(!E.valid(s))throw Error('Tentativa indisponível.');
  if(s.finishedAt)throw Error('Esta tentativa já foi concluída.');
  if(action==='draft')return E.select(s,body&&body.choice);
  if(action==='confirm')return E.confirm(s);
  if(action==='answer')return E.confirm(E.select(s,body&&body.choice));
  if(action==='next')return E.next(s);
  if(action==='finish')return E.finish(s);
  throw Error('Ação inválida.');
}
/* Caderno de erros: agrega alternativas erradas das tentativas já respondidas. */
function caderno(rows,conteudo){
  const c=conteudo||CONTEUDOS[0];
  const mapa=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const estado=row&&row.estado;
    const respostas=estado&&Array.isArray(estado.answers)?estado.answers:[];
    respostas.forEach((a,i)=>{
      if(!a||a.choice===E.KEY[i])return;
      const q=c.questions[i];
      if(!q)return;
      const item=mapa.get(i)||{number:q.number,title:q.title,errors:0,lastWrong:null,lastAt:null};
      item.errors+=1;
      item.lastWrong=a.choice;
      item.lastAt=a.confirmedAt||row.criado_em||null;
      mapa.set(i,item);
    });
  }
  return [...mapa.values()]
    .sort((a,b)=>a.number-b.number)
    .map(item=>{
      const q=c.questions[item.number-1];
      return {
        ...item,
        correctChoice:E.KEY[item.number-1],
        correctExplanation:q.correctExplanation,
        pearl:q.pearl,
        references:c.references
      };
    });
}
module.exports={E,CONTEUDOS,content:CONTEUDOS[0],porSlug,publicState,visible,transition,caderno};
