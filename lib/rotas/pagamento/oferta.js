/* Metadados comerciais públicos. Nunca devolve vídeos, caminhos de PDFs ou alunos. */
'use strict';
const {json,postgrest,sessaoPerfil}=require('../../api');
const {homologacaoAtiva,acessosTeste}=require('../../checkout-homologacao');
const CURSO='fa3c5d8d-94c4-4321-be7a-1cc45741a983';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return json(res,405,{ok:false});
 if(req.query?.curso&&req.query.curso!==CURSO)return json(res,404,{ok:false});
 try{
  const r=await postgrest(`/cursos?id=eq.${CURSO}&select=id,titulo,config_pagamento,modulos(aulas(id))`,{servico:true});const c=r.dados?.[0],p=c?.config_pagamento;
  if(!r.ok||!c||p?.provedor!=='mercado_pago'||!Number.isSafeInteger(p.preco_centavos)||p.preco_centavos<100)throw Error();
  const real=require('../../mercado-pago-producao');
  const usuario=await sessaoPerfil(req);
  const acessoLiberado=usuario?await require('../../api').podeAcessarCurso(usuario,CURSO):false;
  let testeHabilitado=false;
  if(homologacaoAtiva()){
   if(usuario)testeHabilitado=usuario.papel==='admin'||(await acessosTeste(usuario.id,postgrest)).participante;
  }
  return json(res,200,{ok:true,curso:{id:c.id,titulo:c.titulo},precoCentavos:p.preco_centavos,moeda:'BRL',acessoMeses:p.acesso_meses,modulos:c.modulos?.length||0,aulas:(c.modulos||[]).reduce((n,m)=>n+(m.aulas||[]).length,0),vendasAtivas:p.vendas_ativas===true&&real.vendasAtivas(),autenticado:!!usuario,acessoLiberado,testeHabilitado});
 }catch{return json(res,503,{ok:false,erro:'Não foi possível consultar a oferta agora. Tente novamente.'});}
};
