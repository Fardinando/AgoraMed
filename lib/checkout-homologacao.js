'use strict';
const BRANCH='codex/checkout-homologacao-20261109';
function homologacaoAtiva(){return process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF===BRANCH;}
async function acessosTeste(usuarioId,postgrest){
 if(!homologacaoAtiva())return {participante:false,cursos:[]};
 const r=await postgrest('/rpc/acessos_checkout_teste',{metodo:'POST',servico:true,corpo:{p_usuario:usuarioId}});
 if(!r.ok||!r.dados||!Array.isArray(r.dados.cursos))throw Error('Não foi possível conferir o acesso de homologação.');
 return {participante:r.dados.participante===true,cursos:r.dados.cursos};
}
module.exports={homologacaoAtiva,acessosTeste};
