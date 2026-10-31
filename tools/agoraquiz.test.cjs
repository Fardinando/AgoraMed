const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const Q=require('../lib/agoraquiz');
const {randomUUID}=require('crypto');
const {criarBanco,ids}=require('./helpers/banco-curso.cjs');
const quiz='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('conteúdo publicado mantém 11 questões e 44 comentários; só entrega o feedback confirmado',()=>{
 assert.equal(Q.content.questions.length,11);let s=Q.E.fresh();let c=Q.visible(s);assert.ok(!c.closing);for(const q of c.questions)assert.ok(!q.feedback&&!q.extra&&!q.message);
 for(let i=0;i<11;i++){
  for(const choice of 'ABCD'){const selected=Q.E.confirm(Q.E.select(s,choice));c=Q.visible(selected);assert.deepEqual(Object.keys(c.questions[i].feedback),[choice]);assert.equal(c.questions[i].feedback[choice],Q.content.questions[i].feedback[choice]);assert.equal(!!c.questions[i].extra,i===6);}
  s=Q.E.acknowledge(Q.E.confirm(Q.E.select(s,Q.E.KEY[i])));
 }
 assert.equal(Q.E.score(s),11);assert.ok(Q.visible(s).closing.includes('Não iniciar o protocolo'));assert.ok(Q.E.finish(s).finishedAt);
});
test('conclusão sem nota mínima e confirmação obrigatória de leitura',()=>{
 let s=Q.E.fresh();assert.throws(()=>Q.transition(s,'confirm',{}));
 for(let i=0;i<11;i++){s=Q.transition(s,'draft',{choice:Q.E.KEY[i]==='A'?'B':'A'});s=Q.transition(s,'confirm',{});assert.throws(()=>Q.transition(s,'draft',{choice:'A'}));assert.throws(()=>Q.transition(s,'finish',{}));s=Q.transition(s,'read',{});}
 assert.equal(Q.publicState(s).score,0);assert.ok(Q.transition(s,'finish',{}).finishedAt);
});
test('banco: acesso, revisão concorrente, idempotência, histórico e progresso atômico',async()=>{
 const db=await criarBanco();
 try{
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261031025300_agoraquiz_tentativas_e_conclusao.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261031025839_agoraquiz_isolar_validacao_progresso.sql'),'utf8'));
 await db.query("insert into public.aulas(id,modulo_id,titulo,atividade) values($1,$2,'AgoraQuiz','pre-requisitos-v1')",[quiz,ids.modulo]);
 const priv=(await db.query("select has_table_privilege('anon','public.agoraquiz_tentativas','SELECT') as anon,has_table_privilege('authenticated','public.agoraquiz_tentativas','INSERT') as aluno,has_function_privilege('authenticated','public.agoraquiz_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer)','EXECUTE') as rpc")).rows[0];
 assert.deepEqual(priv,{anon:false,aluno:false,rpc:false});
 await assert.rejects(db.query('insert into public.progresso(usuario_id,aula_id) values($1,$2)',[ids.aluno,quiz]),/Conclua o AgoraQuiz/);
 let s=Q.E.fresh(),operation=randomUUID();
 const call=async(state,rev,{nova=false,anterior=null,op=randomUUID(),uid=ids.aluno}={})=>(await db.query('select public.agoraquiz_gravar($1,$2,$3,$4,$5,$6,$7,$8,1) as r',[uid,quiz,state.id,rev,JSON.stringify(state),nova,anterior,op])).rows[0].r;
 let row=await call(s,0,{nova:true,op:operation});assert.equal(row.revisao,1);
 assert.equal((await call(s,0,{nova:true,op:operation})).id,row.id);
 await assert.rejects(call(Q.E.fresh(),0,{nova:true}),/outra sessão/);
 let next=Q.E.select(s,'B');row=await call(next,1);s=next;
 await assert.rejects(call(Q.E.select(s,'A'),1),/outra sessão/);
 for(let i=0;i<11;i++){
   if(i){s=Q.E.select(s,Q.E.KEY[i]);row=await call(s,row.revisao);}
   s=Q.E.confirm(s);row=await call(s,row.revisao);
   s=Q.E.acknowledge(s);row=await call(s,row.revisao);
 }
 assert.equal((await db.query('select * from public.progresso where aula_id=$1',[quiz])).rows.length,0);
 s=Q.E.finish(s);row=await call(s,row.revisao);
 assert.equal((await db.query('select * from public.progresso where aula_id=$1',[quiz])).rows.length,1);
 const fresh=Q.E.fresh();await call(fresh,0,{nova:true,anterior:s.id});
 assert.equal((await db.query('select * from public.agoraquiz_tentativas')).rows.length,2);
 assert.equal((await db.query('select * from public.progresso where aula_id=$1',[quiz])).rows.length,1);
 await assert.rejects(call(s,row.revisao),/outra sessão/);
 await db.query('update perfis set liberado=false where id=$1',[ids.aluno]);
 await assert.rejects(call(fresh,1),/Sem acesso/);
 }finally{await db.close();}
});
function route(overrides={},admin=false){
 const logs=[],user='11111111-1111-4111-8111-111111111111',cid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 const deps={envFaltando:()=>[],sessaoPerfil:async()=>({id:user,liberado:true}),exigirAdmin:async()=>({id:user}),podeAcessarCurso:async()=>true,json:(res,status,body)=>{res.status=status;res.body=body;},postgrest:async(url,opt)=>{logs.push({url,opt});if(url.startsWith('/aulas?'))return {ok:true,dados:[{id:quiz,atividade:Q.SLUG,modulo_id:'m',modulos:{curso_id:cid}}]};if(url.startsWith('/modulos?'))return {ok:true,dados:[{id:'m',aulas:[{id:quiz,ordem:1},{id:'next',ordem:2}]}]};if(url.startsWith('/agoraquiz_tentativas?'))return {ok:true,dados:[]};throw Error(url);},...overrides};
 const file='../lib/rotas/'+(admin?'admin/agoraquiz.js':'agoraquiz.js'),module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module,require:n=>/api$/.test(n)?deps:/curso-edicao$/.test(n)?require('../lib/curso-edicao'):/agoraquiz$/.test(n)?Q:require(n)});
 return {logs,async call(body,query={aula_id:quiz},method=body?'POST':'GET'){const res={headers:{},setHeader(k,v){this.headers[k]=v;}};await module.exports({method,body,query},res);return res;}};
}
test('API nega sessão, matrícula e IDs inválidos antes de devolver caso ou resposta',async()=>{
 let h=route({sessaoPerfil:async()=>null});assert.equal((await h.call()).status,401);assert.equal(h.logs.length,0);
 h=route({podeAcessarCurso:async()=>false});assert.equal((await h.call()).status,403);assert.ok(!h.logs.some(x=>x.url.startsWith('/agoraquiz_tentativas')));
 assert.equal((await route().call(null,{aula_id:'x&select=*'})).status,400);
});
test('API fornece próxima aula real, não vaza comentários e não aceita nota enviada pelo cliente',async()=>{
 const h=route(),r=await h.call();assert.equal(r.status,200);assert.equal(r.headers['Cache-Control'],'private, no-store');assert.match(r.body.nextUrl,/a=next/);assert.ok(!r.body.content.questions[0].feedback);
 assert.equal((await h.call({aula_id:quiz,action:'finish',score:11,operation:randomUUID(),revision:1,attempt:randomUUID()})).status,409);
});
test('relatório de outro aluno é exclusivo do professor e possui paginação',async()=>{
 let reads=0;const h=route({exigirAdmin:async(req,res)=>{res.status=403;return null;},postgrest:async()=>{reads++;}},true);assert.equal((await h.call(null,{usuario_id:randomUUID()})).status,403);assert.equal(reads,0);
 assert.equal((await route({},true).call(null,{usuario_id:'invalid'})).status,400);
});
