/* Arquivos e rede simulados: nenhum aluno, curso ou objeto real é alterado. */
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
process.env.JWT_SECRET='chave-apenas-para-testes-de-pdf';
const pdf=require('../lib/pdf-envio');const helper=require('../lib/curso-edicao');const apiReal=require('../lib/api');
const cursoId='11111111-1111-4111-8111-111111111111',aulaId='22222222-2222-4222-8222-222222222222',adminId='33333333-3333-4333-8333-333333333333',id='44444444-4444-4444-8444-444444444444';
const dados=()=>({id,cursoId,aulaId,adminId,tamanho:30_000_000,nome:'Apostila.pdf',caminho:`${aulaId}/envios/${id}.pdf`});
const escopo={cursoId,aulaId,adminId};
function carregar(file,deps,extra={}){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{module,exports:module.exports,URL,Date,JSON,encodeURIComponent,require:p=>p==='node:crypto'?require('node:crypto'):p==='../../pdf-envio'?pdf:p==='../../curso-edicao'?helper:deps,...extra});return module.exports;}
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(){this.ended=true;}};}
const json=(r,status,dados)=>Object.assign(r,{statusCode:status,dados});
test('comprovante é vinculado ao professor, curso e aula, e não aceita adulteração',()=>{
 const token=pdf.assinar(dados());assert.equal(pdf.conferir(token,escopo).id,id);
 for(const campo of ['adminId','cursoId','aulaId'])assert.throws(()=>pdf.conferir(token,{...escopo,[campo]:'outro'}),/inválido/);
 assert.throws(()=>pdf.conferir(token.slice(0,-8)+'alterado',escopo),/inválido/);
 assert.throws(()=>pdf.conferir(token+'.extra',escopo),/inválido/);
});
test('comprovantes não podem ser usados como sessão de login',()=>{assert.equal(apiReal.verificarJWT(pdf.assinar(dados())),null);});
function resposta(total=30_000_000,prefixo='%PDF-',tipo='application/pdf',status=206){return new Response(prefixo,{status,headers:{'Content-Type':tipo,'Content-Range':`bytes 0-4/${total}`,'Content-Length':status===206?'5':String(total)}});}
test('verifica tamanho de 30 MB lendo só os cinco bytes iniciais',async()=>{
 let vezes=0;await pdf.conferirArquivo(dados(),{SUPABASE_URL:'https://storage.example',SERVICE_KEY:'teste'},async(url,o)=>{vezes++;assert.equal(o.headers.Range,'bytes=0-4');assert.match(url,/\/materiais\//);return resposta();});assert.equal(vezes,1);
});
for(const [nome,response] of [['tamanho diferente',()=>resposta(31_000_000)],['conteúdo falso',()=>resposta(30_000_000,'HTML!')],['MIME diferente',()=>resposta(30_000_000,'%PDF-','text/html')],['arquivo ausente',()=>new Response('',{status:404})]])test(`salvamento recusa ${nome}`,async()=>{await assert.rejects(()=>pdf.conferirArquivo(dados(),{},async()=>response()));});
test('caminho de PDF só chega ao salvamento depois de comprovante e arquivo verificados',async()=>{
 const token=pdf.assinar(dados());const ed={id:cursoId,modulos:[{aulas:[{id:aulaId,pdfs:[{id:null,envio:token}]}]}]};
 const verificados=await pdf.conferirEnvios(ed,adminId,{}, {fetcher:async()=>resposta()});assert.equal(verificados.get(token).caminho,dados().caminho);
 ed.modulos[0].aulas[0].pdfs.push({envio:token});await assert.rejects(()=>pdf.conferirEnvios(ed,adminId,{}, {fetcher:async()=>resposta()}),/repetido/);
});
test('PDF direto usa somente metadados no corpo do salvamento',()=>{
 const token=pdf.assinar(dados());const ed={id:cursoId,titulo:'Teste',tipoAcesso:'gratis',modulos:[{id:'55555555-5555-4555-8555-555555555555',aulas:[{id:aulaId,pdfs:[{envio:token}]}]}]};
 assert.throws(()=>helper.preparar(ed,null,id,{dataUrlParaBytes:apiReal.dataUrlParaBytes}),/conferir/);
 const r=helper.preparar(ed,null,id,{dataUrlParaBytes:apiReal.dataUrlParaBytes,materiaisEnviados:new Map([[token,{id,nome:dados().nome,caminho:dados().caminho}]])});
 assert.equal(r.arquivos.length,0);assert.equal(r.curso.modulos[0].aulas[0].materiais[0].id,id);assert.ok(JSON.stringify(r).length<2000);
});
function rotaEnvio(overrides={}){const chamadas=[];const deps={json,envFaltando:()=>[],exigirAdmin:async()=>({id:adminId}),env:{SUPABASE_URL:'https://storage.example'},postgrest:async(p,o)=>{chamadas.push([p,o]);return {ok:true,dados:[]};},storage:async(m,p,o)=>{chamadas.push([m,p,o]);return {ok:true,dados:{url:`/object/upload/sign/materiais/${aulaId}/envios/${id}.pdf?token=temporario`}};},...overrides};return {handler:carregar('lib/rotas/admin/materiais.js',deps),chamadas};}
const corpo=()=>({cursoId,aulaId,nome:'Apostila.pdf',tamanho:30_000_000});
test('autoriza PDF de 30 MB, reserva limpeza e não revela chave de serviço',async()=>{const r=res(),rota=rotaEnvio();await rota.handler({method:'POST',body:corpo()},r);assert.equal(r.dados.ok,true);const d=pdf.conferir(r.dados.envio,escopo);assert.equal(d.tamanho,30_000_000);assert.match(r.dados.url,/token=temporario/);assert.equal(Object.keys(r.dados).sort().join(','),'envio,ok,url');assert.ok(rota.chamadas.some(c=>c[0]==='/arquivos_curso_pendentes'));assert.ok(!rota.chamadas.some(c=>c[2]?.upsert));});
for(const tamanho of [0,50_000_001])test(`recusa tamanho ${tamanho} antes de gravar`,async()=>{const r=res(),rota=rotaEnvio();await rota.handler({method:'POST',body:{...corpo(),tamanho}},r);assert.equal(r.statusCode,400);assert.equal(rota.chamadas.length,0);});
test('aluno sem papel de professor não recebe URL de envio',async()=>{const r=res(),rota=rotaEnvio({exigirAdmin:async(req,res)=>{json(res,403,{ok:false});return null;}});await rota.handler({method:'POST',body:corpo()},r);assert.equal(r.statusCode,403);assert.equal(rota.chamadas.length,0);});
test('não autoriza envio para aula existente de outro curso',async()=>{const r=res(),rota=rotaEnvio({postgrest:async()=>({ok:true,dados:[{modulos:{curso_id:'outro'}}]})});await rota.handler({method:'POST',body:corpo()},r);assert.equal(r.statusCode,400);assert.equal(r.dados.url,undefined);});
test('download autorizado usa link de cinco minutos sem carregar o PDF na função',async()=>{
 let assinatura=false;const r=res();const handler=carregar('lib/rotas/material.js',{json,envFaltando:()=>[],sessaoPerfil:async()=>({id:adminId}),postgrest:async()=>({ok:true,dados:[{nome:'Apostila.pdf',caminho:dados().caminho,aulas:{modulos:{curso_id:cursoId}}}]}),podeAcessarCurso:async()=>true,env:{SUPABASE_URL:'https://storage.example'},storage:async(m,p,o)=>{assert.equal(m,'POST');assert.equal(JSON.parse(o.corpo).expiresIn,300);assinatura=true;return {ok:true,dados:{signedURL:`/object/sign/materiais/${dados().caminho}?token=privado`}};}},{fetch:()=>assert.fail('Não baixar PDF pela função')});
 await handler({method:'GET',query:{id}},r);assert.equal(assinatura,true);assert.equal(r.statusCode,302);assert.match(r.headers.Location,/token=privado/);assert.equal(new URL(r.headers.Location).searchParams.get('download'),'Apostila.pdf');assert.equal(r.headers['Cache-Control'],'private, no-store');
});
test('navegador envia arquivo de 30 MB fora do JSON e acompanha progresso',async()=>{
 const chamadas=[],progresso=[];class XHR{constructor(){this.upload={};}open(m,u){assert.equal(m,'PUT');assert.equal(u,'https://storage.example/upload');}setRequestHeader(){}send(file){assert.equal(file.size,30_000_000);this.upload.onprogress({lengthComputable:true,loaded:15_000_000,total:30_000_000});this.status=200;this.onload();}}
 const ctx={window:{addEventListener(){}},navigator:{},TextEncoder,TextDecoder,XMLHttpRequest:XHR,crypto:{randomUUID:()=>id},fetch:async(url,o)=>{chamadas.push([url,JSON.parse(o.body)]);return {json:async()=>({ok:true,url:'https://storage.example/upload',envio:'comprovante'})};}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/store.js'),'utf8')+';this.store=Store;',ctx);
 const file={size:30_000_000,name:'Apostila.pdf',slice:()=>({arrayBuffer:async()=>Buffer.from('%PDF-')})};
 const r=await ctx.store.lerPDF(file,{cursoId,aulaId,progresso:n=>progresso.push(n)});assert.equal(r.envio,'comprovante');assert.equal(r.dados,undefined);assert.ok(JSON.stringify(chamadas).length<500);assert.deepEqual(progresso,[0,50,100]);
});
test('comprovante expirado exige nova seleção sem permitir vínculo ao curso',t=>{const token=pdf.assinar(dados());const agora=Date.now();t.mock.method(Date,'now',()=>agora+19*3600*1000);assert.throws(()=>pdf.conferir(token,escopo),/expirou/);});
test('upload incompleto ou rejeitado não devolve material para inserir na aula',async()=>{
 class XHR{constructor(){this.upload={};}open(){}setRequestHeader(){}send(){this.status=413;this.onload();}}
 const ctx={window:{addEventListener(){}},navigator:{},TextEncoder,TextDecoder,XMLHttpRequest:XHR,crypto:{randomUUID:()=>id},fetch:async()=>({json:async()=>({ok:true,url:'https://storage.example/upload',envio:'token'})})};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/store.js'),'utf8')+';this.store=Store;',ctx);
 const file={size:30_000_000,name:'Apostila.pdf',slice:()=>({arrayBuffer:async()=>Buffer.from('%PDF-')})};
 await assert.rejects(()=>ctx.store.lerPDF(file,{cursoId,aulaId}),/curso foi preservado/);
});
