const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const CURSO='fa3c5d8d-94c4-4321-be7a-1cc45741a983',ID='88888888-8888-4888-8888-888888888888',ORIGEM='https://www.andersongleryston.med.br';
function rota(nome,op={}){
 const chamadas=[];
 const pedidoBase={id:ID,usuario_id:null,curso_id:CURSO,preco_centavos:9700,acesso_meses:12};
 const api={json:(r,s,d)=>Object.assign(r,{status:s,dados:d}),sessaoPerfil:async()=>op.semSessao?null:{id:'aluno'},podeAcessarCurso:async()=>!!op.acesso,cookiePedidoCompra:id=>`pedido_compra=${id}`,apagarCookiePedidoCompra:()=>'',pedidoCompraDaRequisicao:()=>ID,postgrest:async(u,o)=>{
  chamadas.push({u,o});
  if(u==='/rpc/reservar_pedido_pagamento_sem_conta')return {ok:true,dados:{...pedidoBase,...op.reserva,...op.pedido}};
  if(u==='/rpc/reivindicar_pedido_pagamento')return op.vinculo||{ok:true,dados:{acessoLiberado:true,fim:'2027-11-17T00:00:00Z'}};
  if(u.startsWith('/cursos?'))return {ok:true,dados:[{titulo:'Hipercalemia'}]};
  if(u.startsWith('/pedidos_pagamento?')&&o?.metodo==='PATCH')return {ok:true};
  if(u.startsWith('/pedidos_pagamento?'))return {ok:true,dados:op.pedido?[op.pedido]:[]};
  return {ok:true,dados:[]};
 }};
 const mp={ORIGEM,vendasAtivas:()=>!op.fechado,credenciaisProntas:()=>!op.fechado,criar:async(p)=>{assert.equal(p.preco_centavos,9700);return {order_id:'ORD123',checkout_url:'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD123'};},confirmar:async()=>{chamadas.push('confirmar');return op.estado||{estado:'aprovado',acessoLiberado:false,emailPagador:'comprador@example.com'};}};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,`../lib/rotas/pagamento/${nome}.js`),'utf8'),{module,process:{env:{MERCADO_PAGO_WEBHOOK_SECRET:'ficticio'}},console:{warn(){}},require:n=>n==='../../api'?api:n==='../../mercado-pago-producao'?mp:n==='../../curso-edicao'?{UUID:/^[0-9a-f-]{36}$/i}:n==='../../mercado-pago'?{checkoutSeguro:u=>u,validarAssinatura:()=>!!op.assinatura}:null});
 return {chamadas,async call(req={}){const res={headers:{},setHeader(k,v){this.headers[k]=v;}};await module.exports({method:'POST',headers:{origin:ORIGEM},body:{operacaoId:ID,preco:1},query:{id:ID},...req},res);return res;}};
}
test('checkout exige produção e origem válida, mas permite reservar sem sessão',async()=>{
 for(const [opts,req,status] of [[{fechado:true},{},503],[{}, {headers:{origin:'https://outro.invalid'}},403]]){const r=rota('checkout',opts);assert.equal((await r.call(req)).status,status);assert.equal(r.chamadas.length,0);}
 const r=rota('checkout',{semSessao:true}),res=await r.call();assert.equal(res.status,200);assert.match(res.dados.url,/mercadopago\.com\.br/);const reserva=r.chamadas.find(c=>c.u==='/rpc/reservar_pedido_pagamento_sem_conta');assert.deepEqual({...reserva.o.corpo},{p_id:ID,p_curso:CURSO});assert.equal(reserva.o.corpo.p_usuario,undefined);
});
test('checkout ignora preço enviado e evita cobrar quem já tem acesso',async()=>{
 const r=rota('checkout');assert.equal((await r.call()).status,200);const reserva=r.chamadas.find(c=>c.u==='/rpc/reservar_pedido_pagamento_sem_conta');assert.equal(reserva.o.corpo.p_curso,CURSO);assert.equal(reserva.o.corpo.preco,undefined);
 const ja=rota('checkout',{acesso:true});assert.equal((await ja.call()).dados.acessoLiberado,true);assert.equal(ja.chamadas.length,0);
});
test('status consulta o pedido sem depender de login ou status no retorno e só libera após vínculo no servidor',async()=>{
 const inexistente=rota('status');assert.equal((await inexistente.call({method:'GET',query:{id:ID,status:'approved'}})).status,404);assert.match(inexistente.chamadas[0].u,/id=eq\.88888888/);assert.doesNotMatch(inexistente.chamadas[0].u,/usuario_id=/);assert.ok(!inexistente.chamadas.includes('confirmar'));
 const pedido={id:ID,usuario_id:null,curso_id:CURSO,order_id:'ORD123'};const ok=rota('status',{pedido});const res=await ok.call({method:'GET'});assert.equal(res.status,200);assert.equal(res.dados.acessoLiberado,true);assert.equal(res.dados.pedidoNaoVinculado,false);assert.ok(ok.chamadas.some(c=>c.u==='/rpc/reivindicar_pedido_pagamento'));
});
test('webhook rejeita sandbox e assinatura inválida antes de consultar pedido',async()=>{
 for(const op of [{assinatura:false},{assinatura:true}]){const r=rota('webhook',op);const id=op.assinatura?'ORDTST123':'ORD123';assert.equal((await r.call({query:{'data.id':id}})).status,401);assert.equal(r.chamadas.length,0);}
 const ok=rota('webhook',{assinatura:true,pedido:{id:ID,order_id:'ORD123'}});assert.equal((await ok.call({query:{'data.id':'ORD123'}})).status,200);assert.ok(ok.chamadas.includes('confirmar'));
});
test('checkout retoma pedido pendente sem criar outra ordem',async()=>{
 const r=rota('checkout',{pedido:{id:ID,usuario_id:null,curso_id:CURSO,order_id:'ORD123',checkout_url:'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD123'},estado:{estado:'pendente',acessoLiberado:false}});const x=await r.call();assert.equal(x.status,200);assert.match(x.dados.url,/ORD123/);assert.ok(!r.chamadas.some(c=>c.u==='/cursos?'));
});
