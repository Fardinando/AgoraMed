const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');
const {readFileSync}=require('node:fs');const {join}=require('node:path');const crypto=require('node:crypto');
const api=require('../lib/api');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const origem='https://banco.example/storage/v1/object/public/capas/';
const jpeg='data:image/jpeg;base64,Y2FwYQ==';
function rota({falhaConsulta=false,falhaEnvio=false,falhaSalvar=false,admin=true}={}){
 let rows=[{id:A,titulo:'Curso A',imagem_url:origem+'a.jpg',ordem:1,ativo:true},{id:B,titulo:'Curso B',imagem_url:origem+'b.jpg',ordem:2,ativo:true}];
 const chamadas=[],uploads=[],apagados=[];const module={exports:{}};
 const deps={...api,env:{SUPABASE_URL:'https://banco.example'},envFaltando:()=>[],exigirAdmin:async()=>admin?{}:null,json:(res,status,dados)=>{res.status=status;res.dados=dados;},
  storage:async(...args)=>{uploads.push(args);return {ok:!falhaEnvio};},apagarStorage:async(...args)=>apagados.push(args),
  postgrest:async(url,opts={})=>{chamadas.push({url,opts});if(!opts.metodo)return {ok:!falhaConsulta,dados:rows.map(x=>({...x}))};
   if(opts.metodo==='POST'){if(falhaSalvar)return {ok:false,status:503};assert.equal(opts.upsert,true);for(const p of opts.corpo){const i=rows.findIndex(x=>x.id===p.id);if(i<0)rows.push({...p});else rows[i]={...rows[i],...p};}return {ok:true,dados:opts.corpo};}
   if(opts.metodo==='DELETE'){const ids=url.slice(url.indexOf('(')+1,-1).split(',');rows=rows.filter(x=>!ids.includes(x.id));return {ok:true};}
  }};
 vm.runInNewContext(readFileSync(join(__dirname,'../lib/rotas/admin/promos.js'),'utf8'),{module,exports:module.exports,require:p=>p==='crypto'?crypto:deps,URL,Buffer});
 return {chamadas,uploads,apagados,get rows(){return rows;},async salvar(lista,removidos){const res={};await module.exports({method:'POST',body:{lista,removidos}},res);return res;}};
}
test('duas divulgações mantêm capas independentes após salvar e recarregar alternadamente',async()=>{
 const r=rota();let result=await r.salvar([{id:A,titulo:'Curso A editado',capaImagem:jpeg}]);
 assert.equal(result.dados.ok,true);assert.equal(r.rows.length,2);assert.equal(r.rows[1].imagem_url,origem+'b.jpg');
 const urlA=result.dados.promos.find(p=>p.id===A).capaImagem;assert.match(urlA,/\.promo\./);
 result=await r.salvar([{id:B,titulo:'Curso B editado',capaImagem:jpeg}]);
 assert.equal(result.dados.ok,true);assert.equal(r.rows.find(p=>p.id===A).imagem_url,urlA);
 const urlB=result.dados.promos.find(p=>p.id===B).capaImagem;
 await r.salvar(result.dados.promos.map(p=>({...p,texto:'Texto atualizado'})));
 assert.equal(r.rows.find(p=>p.id===A).imagem_url,urlA);assert.equal(r.rows.find(p=>p.id===B).imagem_url,urlB);
 assert.equal(r.uploads.length,2);assert.equal(r.apagados.length,0);assert.ok(r.chamadas.every(c=>c.opts.metodo!=='DELETE'));
 assert.ok(r.uploads.every(x=>!x[2].upsert));assert.notEqual(r.uploads[0][1],r.uploads[1][1]);
});
test('falhas de consulta, envio e gravação não apagam divulgações nem capas anteriores',async()=>{
 for(const op of [{falhaConsulta:true},{falhaEnvio:true},{falhaSalvar:true}]){
  const r=rota(op),antes=JSON.stringify(r.rows);const res=await r.salvar([{id:A,titulo:'Novo',capaImagem:jpeg}]);
  assert.equal(res.dados.ok,false);assert.equal(JSON.stringify(r.rows),antes);assert.equal(r.apagados.length,0);assert.ok(!r.chamadas.some(c=>c.opts.metodo==='DELETE'));
 }
});
test('excluir uma divulgação exige ID explícito e preserva a outra',async()=>{
 const r=rota();await r.salvar([]);assert.equal(r.rows.length,2);
 const res=await r.salvar([],[A]);assert.equal(res.dados.ok,true);assert.equal(r.rows.length,1);assert.equal(r.rows[0].id,B);assert.equal(r.rows[0].imagem_url,origem+'b.jpg');assert.equal(r.apagados.length,0);
});
test('entrada inválida ou sem autorização não provoca alterações',async()=>{
 for(const lista of [undefined,[{id:'invalido'}],[{id:A},{id:A}],[{id:A,capaImagem:'data:text/html;base64,YQ=='}]]){
  const r=rota();const res=await r.salvar(lista);assert.equal(res.dados.ok,false);assert.equal(r.rows.length,2);assert.ok(r.chamadas.every(c=>!c.opts.metodo));
 }
 const r=rota({admin:false});await r.salvar([{id:A}]);assert.equal(r.chamadas.length,0);assert.equal(r.uploads.length,0);
});
test('cliente envia só a divulgação alterada e guarda URLs canônicas devolvidas pelo servidor',async()=>{
 const pedidos=[],ctx={crypto:crypto.webcrypto,TextEncoder,URLSearchParams,Map,Set,JSON,Date,navigator:{},location:{protocol:'file:'},window:{addEventListener(){}},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},fetch:async(url,op)=>{pedidos.push(JSON.parse(op.body));return {json:async()=>({ok:true,promos:[{id:A,capaImagem:origem+'nova-a.jpg'},{id:B,capaImagem:origem+'b.jpg'}]})};}};
 vm.runInNewContext(readFileSync(join(__dirname,'../js/store.js'),'utf8')+'\nglobalThis.api=Store;',ctx);
 await ctx.api.salvarPromos([{id:A,capaImagem:jpeg},{id:B,capaImagem:origem+'b.jpg'}],{alterados:[A]});
 assert.equal(pedidos[0].lista.length,1);assert.equal(pedidos[0].lista[0].id,A);assert.equal(ctx.api.promos()[0].capaImagem,origem+'nova-a.jpg');
 await ctx.api.salvarPromos([{id:B}],{alterados:[],removidos:[A]});assert.equal(pedidos[1].lista.length,0);assert.equal(pedidos[1].removidos[0],A);
});
