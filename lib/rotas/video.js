/* O cliente informa a aula/curso, nunca o UID a ser assinado. */
'use strict';
const {json,sessaoPerfil,postgrest,podeAcessarCurso}=require('../api');
const {UUID}=require('../curso-edicao');
const {assinarVideo}=require('../cloudflare-stream');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return json(res,405,{ok:false,erro:'Método não permitido.'});
 const perfil=await sessaoPerfil(req);if(!perfil)return json(res,401,{ok:false,erro:'Entre na plataforma para assistir.'});
 const aula=req.query?.aula,curso=req.query?.curso;
 if((!UUID.test(aula||'')&&!UUID.test(curso||''))||(aula&&curso))return json(res,400,{ok:false,erro:'Vídeo inválido.'});
 try{
  const r=aula?await postgrest(`/aulas?id=eq.${aula}&select=stream_uid,modulos(curso_id)`,{servico:true}):await postgrest(`/cursos?id=eq.${curso}&select=id,abertura`,{servico:true});
  if(!r.ok)return json(res,503,{ok:false,erro:'Não foi possível carregar o vídeo. Tente novamente.'});
  const dado=r.dados?.[0];if(!dado)return json(res,404,{ok:false,erro:'Vídeo indisponível.'});
  const cursoId=aula?dado.modulos?.curso_id:dado.id;
  if(!await podeAcessarCurso(perfil,cursoId))return json(res,403,{ok:false,erro:'Você não tem acesso a este curso.'});
  const uid=aula?dado.stream_uid:dado.abertura?.stream_uid;
  if(!uid)return json(res,404,{ok:false,erro:'Vídeo indisponível.'});
  return json(res,200,{ok:true,...assinarVideo(uid)});
 }catch{return json(res,503,{ok:false,erro:'O vídeo está temporariamente indisponível. Tente novamente em instantes.'});}
};
