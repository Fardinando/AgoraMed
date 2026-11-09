const {test}=require('node:test');const assert=require('node:assert/strict');const {generateKeyPairSync,verify}=require('node:crypto');const {readFileSync}=require('node:fs');const {join}=require('node:path');
const {assinarVideo}=require('../lib/cloudflare-stream');const {normalizarAbertura,preparar}=require('../lib/curso-edicao');
const {criarBanco,editor,rpc,ids}=require('./helpers/banco-curso.cjs');
const uid='d6120f75954326a49d41178f444b0f84';
test('token Stream é assinado, expira e não permite download',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const resultado=assinarVideo(uid,{keyId:'a'.repeat(32),pem:privateKey.export({type:'pkcs8',format:'pem'}),customer:'cliente',agora:100000});
 const token=new URL(resultado.url).pathname.split('/')[1],partes=token.split('.');
 assert.equal(verify('RSA-SHA256',Buffer.from(partes.slice(0,2).join('.')),publicKey,Buffer.from(partes[2],'base64url')),true);
 const payload=JSON.parse(Buffer.from(partes[1],'base64url'));assert.equal(payload.sub,uid);assert.equal(payload.exp,110800);assert.equal(payload.downloadable,false);
 assert.throws(()=>assinarVideo('../outro'));assert.throws(()=>assinarVideo(uid,{keyId:'x',pem:'x',customer:'cliente'}));
});
test('normalização da abertura valida UID e preserva YouTube',()=>{
 const dado=normalizarAbertura({youtubeId:'aBc123XyZ_4',streamUid:uid,duracao:'04:02'});assert.equal(dado.stream_uid,uid);assert.equal(dado.youtube_id,'aBc123XyZ_4');
 assert.throws(()=>normalizarAbertura({streamUid:'https://outro.com'}));
});
test('Stream salva sem recriar aulas e uma edição antiga preserva UID',async()=>{
 const db=await criarBanco();try{
 for(const f of ['20261108111730_configurar_venda_mercado_pago.sql','20261108155118_abertura_curso.sql','20261108190000_cloudflare_stream.sql'])await db.exec(readFileSync(join(__dirname,'../supabase/migrations',f),'utf8'));
 await db.exec('begin');
 let ed=await editor(db);ed.abertura={youtubeId:'',streamUid:uid,duracao:'04:02'};ed.modulos[0].aulas[0].streamUid=uid;
 await rpc(db,ed);ed=await editor(db);assert.equal(ed.abertura.streamUid,uid);assert.equal(ed.modulos[0].aulas[0].streamUid,uid);
 const antes=(await db.query('select * from public.progresso order by aula_id')).rows;
 delete ed.modulos[0].aulas[0].streamUid;delete ed.abertura.streamUid;
 const anterior=(await db.query('select * from public.cursos where id=$1',[ids.curso])).rows[0];anterior.modulos=[{aulas:(await db.query('select * from public.aulas')).rows.map(a=>({...a,materiais:ed.modulos.flatMap(m=>m.aulas).find(x=>x.id===a.id)?.pdfs||[]}))}];
 const preparado=preparar(ed,anterior,ids.outroCurso,{baseUrl:'https://example.invalid',dataUrlParaBytes:()=>null}).curso;
 await rpc(db,ed,{operacao:ids.outroCurso,curso:preparado});const salvo=await editor(db);assert.equal(salvo.modulos[0].aulas[0].streamUid,uid);assert.equal(salvo.abertura.streamUid,uid);
 assert.deepEqual((await db.query('select * from public.progresso order by aula_id')).rows,antes);
 }finally{await db.close();}
});
test('endpoint não assina sem sessão ou matrícula e ignora UID enviado pelo navegador',async()=>{
 const vm=require('node:vm');let assinaturas=0;
 async function chamar({sessao=true,acesso=true,query={curso:ids.curso},metodo='GET'}={}){
  const module={exports:{}};
  vm.runInNewContext(readFileSync(join(__dirname,'../lib/rotas/video.js'),'utf8'),{module,require:n=>n==='../api'?{json:(r,status,dados)=>Object.assign(r,{status,dados}),sessaoPerfil:async()=>sessao?{id:ids.aluno}:null,postgrest:async()=>({ok:true,dados:[{id:ids.curso,abertura:{stream_uid:uid}}]}),podeAcessarCurso:async()=>acesso}:n==='../curso-edicao'?require('../lib/curso-edicao'):{assinarVideo:v=>{assert.equal(v,uid);assinaturas++;return {url:'https://example.invalid'};}}});
  const res={setHeader(){}};await module.exports({method:metodo,query},res);return res;
 }
 assert.equal((await chamar({sessao:false})).status,401);assert.equal((await chamar({acesso:false})).status,403);assert.equal((await chamar({query:{curso:'invalido',uid}})).status,400);assert.equal(assinaturas,0);
 assert.equal((await chamar({query:{curso:ids.curso,uid:'outro-video'}})).status,200);assert.equal(assinaturas,1);
});
