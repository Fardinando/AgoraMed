const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const mp=require('../lib/mercado-pago');
test('falha e cancelamento do provedor nunca são tratados como aprovação',()=>{
 const p={id:'p',order_id:'ORDTST1',preco_centavos:9700};const o={id:p.order_id,external_reference:p.id,currency:'BRL',user_id:'3829170862',integration_data:{application_id:'6132625255477789'},total_amount:'97.00',total_paid_amount:'97.00'};
 assert.equal(mp.conferir({...o,status:'action_required',status_detail:'waiting_retry',transactions:{payments:[{status:'failed',status_detail:'rejected_by_issuer'}]}},p),'rejeitado');
 assert.equal(mp.conferir({...o,status:'processed',status_detail:'accredited',transactions:{payments:[{status:'failed'},{status:'processed'}]}},p),'aprovado');
 for(const [status,esperado] of [['failed','rejeitado'],['canceled','cancelled'],['refunded','refunded'],['created','pendente']])assert.equal(mp.conferir({...o,status},p),esperado);
});
test('autorização de teste existe só na branch Preview exata e falha fechada',async()=>{
 const module={exports:{}};const env={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/checkout-homologacao.js'),'utf8'),{module,process:{env}});const h=module.exports;let chamadas=0;const consultar=async()=>{chamadas++;return {ok:true,dados:{participante:true,cursos:['curso']}};};
 for(const [ambiente,branch] of [['production','codex/checkout-homologacao-20261109'],['preview','outra'],[undefined,undefined]]){env.VERCEL_ENV=ambiente;env.VERCEL_GIT_COMMIT_REF=branch;assert.equal((await h.acessosTeste('aluno',consultar)).participante,false);}assert.equal(chamadas,0);
 env.VERCEL_ENV='preview';env.VERCEL_GIT_COMMIT_REF='codex/checkout-homologacao-20261109';assert.equal((await h.acessosTeste('aluno',consultar)).participante,true);await assert.rejects(h.acessosTeste('aluno',async()=>({ok:false})));assert.equal(chamadas,1);
});
test('ledger autoriza somente fixture privilegiada: recusa, aprovação, estorno, replay e expiração',async()=>{
 const {criarBanco,ids}=require('./helpers/banco-curso.cjs');const db=await criarBanco();try{
 await db.exec("alter table auth.users add column raw_app_meta_data jsonb default '{}';");
 for(const f of ['20261109090000_pedidos_pagamento_teste.sql','20261109100000_confirmacao_pagamento_teste.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',f),'utf8'));
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261110002705_acesso_checkout_homologacao.sql'),'utf8'));
 const p='88888888-8888-4888-8888-888888888888';await db.query('insert into public.pedidos_pagamento_teste(id,usuario_id,curso_id,preco_centavos,acesso_meses,order_id) values($1,$2,$3,9700,12,$4)',[p,ids.aluno,ids.curso,'ORDTST1']);
 const acesso=async()=> (await db.query('select public.acessos_checkout_teste($1) as r',[ids.aluno])).rows[0].r;
 const confirmar=async(e,t)=>(await db.query('select public.confirmar_pagamento_teste($1,$2,$3) as r',[p,e,t])).rows[0].r;
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{agoramed_checkout_teste:true},ids.aluno]);assert.equal((await acesso()).participante,false);
 await db.query('update auth.users set raw_app_meta_data=$1 where id=$2',[{agoramed_checkout_teste:true},ids.aluno]);assert.deepEqual((await acesso()).cursos,[]);
 await confirmar('rejeitado','2026-11-01Z');assert.deepEqual((await acesso()).cursos,[]);
 const a=await confirmar('aprovado','2026-11-02Z');assert.deepEqual((await acesso()).cursos,[ids.curso]);assert.equal((await confirmar('aprovado','2026-11-03Z')).fim,a.fim);
 await confirmar('refunded','2026-11-04Z');assert.deepEqual((await acesso()).cursos,[]);await confirmar('aprovado','2026-11-02Z');assert.deepEqual((await acesso()).cursos,[]);
 await confirmar('aprovado','2026-11-05Z');await db.query("update public.pedidos_pagamento_teste set acesso_ate=now()-interval '1 second' where id=$1",[p]);assert.deepEqual((await acesso()).cursos,[]);
 assert.equal((await db.query('select count(*)::int as n from public.matriculas')).rows[0].n,1);
 const priv=(await db.query("select has_function_privilege('anon','public.acessos_checkout_teste(uuid)','EXECUTE') as anon,has_function_privilege('authenticated','public.acessos_checkout_teste(uuid)','EXECUTE') as auth,has_function_privilege('service_role','public.acessos_checkout_teste(uuid)','EXECUTE') as service")).rows[0];assert.deepEqual(priv,{anon:false,auth:false,service:true});
 }finally{await db.close();}
});
function endpoint({ativo=true,admin=true,orderId='ORDTST1',estado='aprovado',origem=true}={}){
 const chamadas=[];const p={id:'88888888-8888-4888-8888-888888888888',order_id:orderId};const module={exports:{}};
 const api={json:(r,status,dados)=>Object.assign(r,{status,dados}),sessaoPerfil:async()=>({papel:admin?'admin':'aluno'}),postgrest:async(url)=>({ok:true,dados:[p]})};
 const mercado={origemPermitida:()=>origem,conferir:()=>estado,requisitar:async(url,opts={})=>{chamadas.push({url,opts});return {status:opts.metodo==='POST'?'refunded':'processed'};}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/rotas/pagamento/homologacao.js'),'utf8'),{module,require:n=>n==='crypto'?require('node:crypto'):n==='../../api'?api:n==='../../checkout-homologacao'?{homologacaoAtiva:()=>ativo}:n==='../../mercado-pago'?mercado:require('../lib/curso-edicao')});
 return {chamadas,async executar(){const r={setHeader(){}};await module.exports({method:'POST',headers:{origin:'https://teste.invalid'},body:{acao:'estornar',id:p.id}},r);return r;}};
}
test('estorno administrativo fica restrito à homologação e pedidos ORDTST aprovados',async()=>{
 for(const [opts,status] of [[{ativo:false},404],[{admin:false},403],[{origem:false},403],[{orderId:'ORDREAL1'},404],[{estado:'pendente'},409]]){const e=endpoint(opts);assert.equal((await e.executar()).status,status);assert.ok(!e.chamadas.some(c=>c.opts.metodo==='POST'));}
 const e=endpoint();assert.equal((await e.executar()).status,200);assert.equal(e.chamadas.length,3);assert.equal(e.chamadas[1].url,'/v1/orders/ORDTST1/refund');assert.match(e.chamadas[1].opts.chave,/^[a-f0-9-]{36}$/);const r=endpoint({estado:'refunded'});assert.equal((await r.executar()).status,200);assert.equal(r.chamadas.length,1);
});
test('formulários de autenticação não enviam dados pela URL se o script ainda não carregou',()=>{const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');for(const id of ['form-entrar','form-cadastrar','form-esqueci'])assert.match(html,new RegExp('<form[^>]*method="post"[^>]*id="'+id+'"'));});
