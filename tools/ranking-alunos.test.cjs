const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const cid='36c4246d-1f58-424b-ad07-c494ad7d4bd1';
function ambiente(options={}) {
 const calls=[];const module={exports:{}};
 const curso={id:cid,titulo:'Curso teste',tipo_acesso:options.pago?'pago':'gratis'};
 const perfis=[{id:'b',nome:'Bruno'},{id:'a',nome:'Ana'},{id:'c',nome:'Carlos'},{id:'d',nome:'Dora'}];
 const aulas=Array.from({length:options.total??4},(_,i)=>({id:'a'+i}));
 const progresso=options.progresso??[{usuario_id:'b',aula_id:'a0'},{usuario_id:'b',aula_id:'a1'},{usuario_id:'a',aula_id:'a0'},{usuario_id:'a',aula_id:'a1'},{usuario_id:'c',aula_id:'a0'},{usuario_id:'d',aula_id:'a0'},{usuario_id:'professor',aula_id:'a0'},{usuario_id:'bloqueado',aula_id:'a0'},{usuario_id:'a',aula_id:'fora-do-curso'},{usuario_id:'a',aula_id:'a0'}];
 const deps={
  envFaltando:()=>options.env?['x']:[],
  exigirAdmin:async(req,res)=>{if(options.negado){res.status=403;return null;}return {id:'admin'};},
  json(res,status,body){res.status=status;res.body=body;},
  postgrest:async(url,opts)=>{
   calls.push(url);assert.equal(opts.servico,true);
   if(options.falha&&url.startsWith('/'+options.falha+'?'))return {ok:false,dados:null};
   let rows;
   if(url.startsWith('/cursos?'))rows=options.inexistente?[]:[curso];
   else if(url.startsWith('/aulas?')){assert.ok(url.includes(`modulos.curso_id=eq.${cid}`));rows=aulas;}
   else if(url.startsWith('/perfis?')){assert.match(url,/papel=eq.aluno&liberado=eq.true/);rows=perfis;}
   else if(url.startsWith('/matriculas?')){assert.ok(url.includes(`curso_id=eq.${cid}`));rows=[{usuario_id:'c'}];}
   else if(url.startsWith('/progresso?')){assert.ok(url.includes(`aulas.modulos.curso_id=eq.${cid}`));assert.match(url,/aulas!inner\(modulos!inner/);rows=progresso;}
   else throw Error('Consulta inesperada: '+url);
   const q=new URL(url,'https://teste').searchParams;const offset=Number(q.get('offset')||0),limit=Number(q.get('limit')||1000);
   return {ok:true,dados:rows.slice(offset,offset+limit)};
  }
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/rotas/admin/ranking.js'),'utf8'),{module,exports:module.exports,require:()=>deps});
 return {calls,async run(query={curso_id:cid},method='GET') {const res={headers:{},setHeader(k,v){this.headers[k]=v;}};await module.exports({query,method},res);return res;}};
}
test('top 3 por progresso, desempate alfabético e sem professores ou bloqueados',async()=>{
 const r=await ambiente().run();assert.equal(r.status,200);assert.equal(r.headers['Cache-Control'],'private, no-store');
 assert.deepEqual(Array.from(r.body.ranking,a=>a.nome),['Ana','Bruno','Carlos']);assert.deepEqual(Array.from(r.body.ranking,a=>a.percentual),[50,50,25]);
 assert.equal(r.body.ranking[0].feitas,2);assert.equal(r.body.ranking[0].total,4);assert.equal(r.body.ranking[0].email,undefined);
});
test('cursos pagos consideram somente alunos matriculados',async()=>{const r=await ambiente({pago:true}).run();assert.deepEqual(Array.from(r.body.ranking,a=>a.id),['c']);});
test('gratuito não exige matrícula e consulta só o curso escolhido',async()=>{const a=ambiente();await a.run();assert.ok(!a.calls.some(p=>p.startsWith('/matriculas?')));});
test('sem aulas não cria vencedores nem consulta conclusões',async()=>{const a=ambiente({total:0});const r=await a.run();assert.equal(r.body.ranking.length,0);assert.equal(r.body.curso.total,0);assert.ok(!a.calls.some(p=>p.startsWith('/progresso?')));});
test('alunos sem aulas concluídas não entram no ranking',async()=>{const r=await ambiente({progresso:[]}).run();assert.equal(r.body.ranking.length,0);});
test('paginação inclui aulas e progresso além dos primeiros mil registros',async()=>{
 const progresso=Array.from({length:1001},(_,i)=>({usuario_id:'a',aula_id:'a'+i}));const a=ambiente({total:1001,progresso});const r=await a.run();
 assert.equal(r.body.ranking[0].total,1001);assert.equal(r.body.ranking[0].feitas,1001);assert.equal(r.body.ranking[0].percentual,100);
 assert.ok(a.calls.some(p=>p.startsWith('/aulas?')&&p.includes('offset=1000')));assert.ok(a.calls.some(p=>p.startsWith('/progresso?')&&p.includes('offset=1000')));
});
test('ordena pela proporção real antes do arredondamento da porcentagem',async()=>{
 const progresso=[...Array.from({length:199},(_,i)=>({usuario_id:'a',aula_id:'a'+i})),...Array.from({length:200},(_,i)=>({usuario_id:'b',aula_id:'a'+i}))];
 const r=await ambiente({total:200,progresso}).run();assert.equal(r.body.ranking[0].id,'b');
});
for(const falha of ['cursos','perfis','aulas','progresso','matriculas'])test(`falha em ${falha} não vira ranking parcial ou vazio`,async()=>{
 const r=await ambiente({falha,pago:true}).run();assert.equal(r.status,503);assert.equal(r.body.ok,false);assert.equal(r.body.ranking,undefined);
});
test('somente professor acessa o ranking',async()=>{const a=ambiente({negado:true});assert.equal((await a.run()).status,403);assert.equal(a.calls.length,0);});
test('rejeita curso inválido, repetido e métodos de escrita antes de consultar dados',async()=>{const a=ambiente();for(const curso_id of ['x&select=*',[cid],undefined])assert.equal((await a.run({curso_id})).status,400);assert.equal((await a.run({curso_id:cid},'POST')).status,405);assert.equal(a.calls.length,0);});
test('curso excluído ou desconhecido retorna 404',async()=>{assert.equal((await ambiente({inexistente:true}).run()).status,404);});
function interfaceTeste(fetch) {
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:cid,textContent:'',innerHTML:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,f){this[k]=f;}});return nodes.get(id);};
 const ctx={document:{getElementById:node},Store:{cursos:()=>[{id:cid,titulo:'Um curso'}],rankingAlunos:fetch},UI:{escapar:v=>String(v).replaceAll('<','&lt;').replaceAll('>','&gt;')}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/admin-ranking.js'),'utf8')+'\nglobalThis.ranking = RankingAlunos;',ctx);
 return {node,ui:ctx.ranking};
}
test('resposta atrasada não substitui a consulta mais recente',async()=>{
 let resolve,calls=0;const b=interfaceTeste(()=>++calls===1?new Promise(r=>{resolve=r;}):Promise.resolve({ok:true,curso:{titulo:'Atual',total:1},ranking:[]}));
 const anterior=b.ui.atualizar();await b.ui.atualizar();resolve({ok:true,curso:{titulo:'Antigo',total:1},ranking:[]});await anterior;assert.match(b.node('ranking-status').textContent,/Ainda não há/);assert.equal(b.node('ranking-atualizar').disabled,false);
});
test('nome de aluno é escapado e porcentagem é exibida',async()=>{
 const b=interfaceTeste(async()=>({ok:true,curso:{titulo:'Teste',total:4},ranking:[{id:'a',nome:'<Aluno>',total:4,feitas:3,percentual:75}]}));await b.ui.atualizar();assert.match(b.node('ranking-alunos-lista').innerHTML,/&lt;Aluno&gt;/);assert.match(b.node('ranking-alunos-lista').innerHTML,/75%/);
});
test('erro oferece nova tentativa sem inventar progresso',async()=>{const b=interfaceTeste(async()=>({ok:false,erro:'Falha simulada'}));await b.ui.atualizar();assert.equal(b.node('ranking-status').textContent,'Falha simulada');assert.equal(b.node('ranking-alunos-lista').innerHTML,'');assert.equal(b.node('ranking-atualizar').disabled,false);});
