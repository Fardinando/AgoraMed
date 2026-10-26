const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const {readFileSync}=require('node:fs');const {join}=require('node:path');
const apiReal=require('../lib/api');const auxiliares=require('../lib/curso-edicao');
const id='36c4246d-1f58-424b-ad07-c494ad7d4bd1',op='88888888-8888-4888-8888-888888888888',admin='11111111-1111-4111-8111-111111111111';
const raw={id,titulo:'Curso original',versao:7,tipo_acesso:'gratis',url_vendas:'',capa_url:'https://banco.example/storage/v1/object/public/capas/capa-original.jpg',modulos:[{id:'33333333-3333-4333-8333-333333333333',titulo:'Módulo',ordem:1,aulas:[{id:'44444444-4444-4444-8444-444444444444',titulo:'Aula',ordem:1,materiais:[]}]}]};
const base=()=>({curso:apiReal.cursoParaEd(raw),removidos:{modulos:[],aulas:[],materiais:[]},operacaoId:op});
function rota(opcoes={}){
 const consultas=[],arquivos=[];const module={exports:{}};
 const deps={...apiReal,json(res,status,dados){res.status=status;res.dados=dados;},envFaltando:()=>[],exigirAdmin:async()=>({id:admin}),env:{SUPABASE_URL:'https://banco.example'},
  postgrest:async(url,opts={})=>{consultas.push({url,opts});if(opcoes.postgrest)return opcoes.postgrest(url,opts);if(url.startsWith('/operacoes_curso'))return {ok:true,dados:[]};if(url.startsWith('/cursos?'))return {ok:true,dados:[raw]};if(url==='/rpc/salvar_curso_atomico')return {ok:true,dados:{ok:true,curso:{...raw,versao:8}}};return {ok:true,dados:[]};},
  storage:async(...args)=>{arquivos.push(args);return opcoes.storage?opcoes.storage(...args):{ok:true};}
 };
 vm.runInNewContext(readFileSync(join(__dirname,'../lib/rotas/admin/cursos.js'),'utf8'),{module,exports:module.exports,require:p=>p==='crypto'?require('node:crypto'):p==='../../curso-edicao'?auxiliares:p==='../../pdf-envio'?require('../lib/pdf-envio'):deps,URL,Date,JSON,Promise,encodeURIComponent});
 return {consultas,arquivos,async executar(body=base(),method='POST',query={}){const res={setHeader(){}};await module.exports({method,body,query},res);return res;}};
}
test('salvamento usa uma única RPC para todo o conteúdo, sem gravações individuais',async()=>{
 const r=rota();const resposta=await r.executar();assert.equal(resposta.dados.ok,true);assert.equal(resposta.dados.curso.versao,8);
 assert.deepEqual(r.consultas.map(x=>x.url.split('?')[0]),['/operacoes_curso','/cursos','/rpc/salvar_curso_atomico']);
 const envio=r.consultas[2].opts.corpo;assert.equal(envio.p_admin,admin);assert.equal(envio.p_versao,7);assert.equal(envio.p_curso.tipo_acesso,'gratis');assert.equal(r.arquivos.length,0);
});
test('GET do editor sempre consulta a versão atual sem gravar',async()=>{
 const r=rota();const resposta=await r.executar({},'GET',{id});assert.equal(resposta.dados.curso.versao,7);assert.equal(r.consultas.length,1);assert.equal(r.consultas[0].opts.metodo,undefined);
});
test('versão antiga é recusada antes de enviar arquivos',async()=>{
 const r=rota();const b=base();b.curso.versao=6;b.curso.capaImagem='data:image/jpeg;base64,Y2FwYQ==';const antes=JSON.stringify(b);
 const resposta=await r.executar(b);assert.equal(resposta.status,409);assert.equal(resposta.dados.conflito,true);assert.equal(r.arquivos.length,0);assert.ok(!r.consultas.some(x=>x.url.includes('/rpc/')));assert.equal(JSON.stringify(b),antes);
});
test('cliente antigo sem versão é recusado sem qualquer gravação',async()=>{const r=rota();const b=base();delete b.curso.versao;const resposta=await r.executar(b);assert.equal(resposta.status,409);assert.equal(r.consultas.length,0);});
test('falha de upload preserva capa anterior e não chama RPC',async()=>{
 const r=rota({storage:async()=>({ok:false,status:503})});const b=base();b.curso.capaImagem='data:image/jpeg;base64,Y2FwYQ==';const resposta=await r.executar(b);
 assert.equal(resposta.dados.ok,false);assert.ok(!r.consultas.some(x=>x.url.includes('/rpc/')));assert.ok(r.arquivos.every(x=>x[0]==='POST'&&!x[2].upsert));assert.ok(r.arquivos[0][1].includes(op));assert.ok(!r.arquivos[0][1].includes('capa-original'));
});
test('repetir upload já recebido não sobrescreve o arquivo e permite confirmar a tentativa',async()=>{
 const r=rota({storage:async()=>({ok:false,status:400,dados:{message:'Asset Already Exists'}})});const b=base();b.curso.capaImagem='data:image/jpeg;base64,Y2FwYQ==';const resposta=await r.executar(b);
 assert.equal(resposta.dados.ok,true);assert.ok(r.arquivos.every(x=>x[0]==='POST'&&!x[2].upsert));
});
test('falha ou perda da resposta da RPC não apaga arquivos antigos',async()=>{
 const r=rota({postgrest:async(url)=>{if(url.startsWith('/operacoes_curso'))return {ok:true,dados:[]};if(url.startsWith('/cursos?'))return {ok:true,dados:[raw]};if(url.startsWith('/rpc/'))throw Error('Conexão interrompida');return {ok:true,dados:[]};}});
 const b=base();b.curso.capaImagem='data:image/jpeg;base64,Y2FwYQ==';const resposta=await r.executar(b);assert.equal(resposta.dados.ok,false);assert.match(resposta.dados.erro,/confirmar/);assert.ok(r.arquivos.every(x=>x[0]==='POST'));
});
test('repetição confirmada retorna o resultado sem refazer upload ou salvamento',async()=>{
 let hash;
 const primeiro=rota({postgrest:async(url,opts)=>{if(url.startsWith('/operacoes_curso'))return {ok:true,dados:[]};if(url.startsWith('/cursos?'))return {ok:true,dados:[raw]};hash=opts.corpo.p_curso.requisicao;return {ok:true,dados:{ok:true,curso:{...raw,versao:8}}};}});
 await primeiro.executar();const r=rota({postgrest:async()=>({ok:true,dados:[{admin_id:admin,requisicao:hash,resultado:{ok:true,curso:{...raw,versao:8}}}]})});const resposta=await r.executar();assert.equal(resposta.dados.ok,true);assert.equal(r.consultas.length,1);assert.equal(r.arquivos.length,0);
});
test('repetição com outra identidade ou outros dados não revela o resultado',async()=>{
 const r=rota({postgrest:async()=>({ok:true,dados:[{admin_id:'outro',requisicao:'diferente',resultado:{segredo:'não mostrar'}}]})});const resposta=await r.executar();assert.equal(resposta.status,409);assert.equal(resposta.dados.curso,undefined);
});
test('PDFs existentes não podem ser substituídos por caminhos enviados pelo cliente',()=>{
 const b=base();b.curso.modulos[0].aulas[0].pdfs=[{id:'66666666-6666-4666-8666-666666666666',caminho:'arquivo-de-outro-curso.pdf'}];
 assert.throws(()=>auxiliares.preparar(b.curso,raw,op,{dataUrlParaBytes:apiReal.dataUrlParaBytes,baseUrl:'https://banco.example'}),/versão atual/);
});
test('limpeza só ocorre após confirmação e respeita referências de arquivos',async()=>{
 let confirmado=false;
 const r=rota({postgrest:async(url,opts)=>{
  if(url.startsWith('/operacoes_curso'))return {ok:true,dados:[]};if(url.startsWith('/cursos?id='))return {ok:true,dados:[raw]};
  if(url==='/rpc/salvar_curso_atomico'){confirmado=true;return {ok:true,dados:{ok:true,curso:{...raw,versao:8},limpeza_pendente:true}};}
  assert.ok(confirmado,'Nenhuma limpeza antes do commit');
  if(url.startsWith('/arquivos_curso_pendentes?disponivel'))return {ok:true,dados:[{bucket:'materiais',caminho:'aula/arquivo.pdf'}]};
  if(url.startsWith('/materiais?'))return {ok:true,dados:[{id:'ainda-referenciado'}]};return {ok:true,dados:[]};
 }});assert.equal((await r.executar()).dados.ok,true);assert.equal(r.arquivos.length,0);
});
test('falha ao conferir referências nunca apaga o arquivo e mantém o salvamento confirmado',async()=>{
 const r=rota({postgrest:async(url)=>{
  if(url.startsWith('/operacoes_curso'))return {ok:true,dados:[]};if(url.startsWith('/cursos?id='))return {ok:true,dados:[raw]};
  if(url==='/rpc/salvar_curso_atomico')return {ok:true,dados:{ok:true,curso:{...raw,versao:8},limpeza_pendente:true}};
  if(url.startsWith('/arquivos_curso_pendentes?disponivel'))return {ok:true,dados:[{bucket:'materiais',caminho:'aula/arquivo.pdf'}]};
  return {ok:false,status:503};
 }});assert.equal((await r.executar()).dados.ok,true);assert.equal(r.arquivos.length,0);
});
test('falha da limpeza deixa a entrada pendente para nova tentativa',async()=>{
 const r=rota({storage:async(m,p,o)=>{assert.equal(m,'DELETE');assert.equal(p,'object/materiais');assert.deepEqual(JSON.parse(o.corpo),{prefixes:['aula/arquivo.pdf']});return {ok:false,status:503};},postgrest:async(url)=>{
  if(url.startsWith('/operacoes_curso'))return {ok:true,dados:[]};if(url.startsWith('/cursos?id='))return {ok:true,dados:[raw]};
  if(url==='/rpc/salvar_curso_atomico')return {ok:true,dados:{ok:true,curso:{...raw,versao:8},limpeza_pendente:true}};
  if(url.startsWith('/arquivos_curso_pendentes?disponivel'))return {ok:true,dados:[{bucket:'materiais',caminho:'aula/arquivo.pdf'}]};
  return {ok:true,dados:[]};
 }});assert.equal((await r.executar()).dados.ok,true);assert.equal(r.arquivos.length,1);assert.ok(!r.consultas.some(x=>x.url.startsWith('/arquivos_curso_pendentes?bucket=')&&x.opts.metodo==='DELETE'));
});
