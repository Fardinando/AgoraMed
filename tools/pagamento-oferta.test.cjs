const {test}=require('node:test');const assert=require('node:assert/strict');const {readFileSync}=require('node:fs');const {join}=require('node:path');
const {configurarPagamento,preparar}=require('../lib/curso-edicao');const {cursoParaEd}=require('../lib/api');
const {criarBanco,editor,rpc,snapshot,ids}=require('./helpers/banco-curso.cjs');
const oferta={tipoAcesso:'mercado_pago',precoReais:'39,70',acessoMeses:12};
test('preço de Hipercalemia é convertido sem arredondamento e não ativa cobranças',()=>{
 assert.deepEqual(configurarPagamento({...oferta,vendas_ativas:true}),{provedor:'mercado_pago',preco_centavos:3970,acesso_meses:12,vendas_ativas:false});
 assert.equal(configurarPagamento({...oferta,precoReais:'39.70'}).preco_centavos,3970);
 for(const precoReais of ['','0','-39,70','39,701','NaN','1e3','R$ 39,70'])assert.throws(()=>configurarPagamento({...oferta,precoReais}));
 assert.throws(()=>configurarPagamento({...oferta,acessoMeses:0}));
});
test('curso pago retorna o modo automático e valores para reabrir o editor',()=>{
 const ed=cursoParaEd({id:ids.curso,tipo_acesso:'pago',config_pagamento:configurarPagamento(oferta)});
 assert.equal(ed.tipoAcesso,'mercado_pago');assert.equal(ed.precoReais,'39,70');assert.equal(ed.acessoMeses,12);
});
test('configuração automática persiste atomicamente e não altera acessos',async t=>{
 const db=await criarBanco();
 try{
  await db.exec(readFileSync(join(__dirname,'../supabase/migrations/20261108111730_configurar_venda_mercado_pago.sql'),'utf8'));
  async function caso(nome,fn){await t.test(nome,async()=>{await db.exec('begin');try{await fn();}finally{await db.exec('rollback');}});}
  await caso('salvar e reabrir mantém preço e um ano, sem mudar matrículas/progresso',async()=>{
   const antes=await snapshot(db),ed={...await editor(db),...oferta};const result=await rpc(db,ed);
   assert.equal(result.curso.tipo_acesso,'pago');assert.equal(result.curso.config_pagamento.preco_centavos,3970);assert.equal(result.curso.config_pagamento.vendas_ativas,false);
   const novo=await editor(db);assert.equal(novo.tipoAcesso,'mercado_pago');assert.equal(novo.precoReais,'39,70');
   const depois=await snapshot(db);for(const tab of ['matriculas','progresso','modulos','aulas','materiais'])assert.deepEqual(depois[tab],antes[tab]);
  });
  await caso('editor antigo não apaga uma oferta de pagamento sem conhecer seus campos',async()=>{
   await rpc(db,{...await editor(db),...oferta});const atual=await editor(db);const raw=(await db.query('select * from public.cursos where id=$1',[ids.curso])).rows[0];
   const velho={...atual,tipoAcesso:'pago'};delete velho.precoReais;delete velho.acessoMeses;
   const c=preparar(velho,{...raw,modulos:velho.modulos.map(m=>({aulas:m.aulas.map(a=>({materiais:a.pdfs}))}))},'88888888-8888-4888-8888-888888888888',{baseUrl:'https://example.invalid',dataUrlParaBytes:()=>null}).curso;
   assert.equal(c.config_pagamento.preco_centavos,3970);
  });
  await caso('banco rejeita ativação prematura ou preço inválido',async()=>{
   for(const config of [{...configurarPagamento(oferta),vendas_ativas:true},{...configurarPagamento(oferta),preco_centavos:-1},{provedor:'mercado_pago',vendas_ativas:false}]){
    await db.exec('savepoint invalido');await assert.rejects(db.query("update public.cursos set tipo_acesso='pago',config_pagamento=$1 where id=$2",[JSON.stringify(config),ids.curso]));await db.exec('rollback to savepoint invalido');await db.exec('release savepoint invalido');
   }
  });
  await caso('trocar explicitamente para liberação manual limpa apenas a oferta',async()=>{
   await rpc(db,{...await editor(db),...oferta});const ed=await editor(db);ed.tipoAcesso='pago';
   const r=await rpc(db,ed,{operacao:'99999999-9999-4999-8999-999999999999'});assert.equal(r.curso.config_pagamento,null);assert.equal(r.curso.tipo_acesso,'pago');
  });
 }finally{await db.close();}
});
