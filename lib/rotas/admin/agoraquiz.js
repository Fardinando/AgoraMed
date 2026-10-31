'use strict';
const {json,envFaltando,exigirAdmin,postgrest}=require('../../api');
const {UUID}=require('../../curso-edicao');
const {E,content}=require('../../agoraquiz');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return json(res,405,{ok:false,erro:'Método não permitido.'});
 if(envFaltando().length)return json(res,503,{ok:false,erro:'Serviço indisponível.'});
 if(!await exigirAdmin(req,res))return;
 const uid=req.query?.usuario_id,offset=Number(req.query?.offset||0);
 if(typeof uid!=='string'||!UUID.test(uid)||!Number.isInteger(offset)||offset<0||offset>100000)return json(res,400,{ok:false,erro:'Aluno ou página inválidos.'});
 try{
 const r=await postgrest(`/agoraquiz_tentativas?usuario_id=eq.${uid}&select=id,aula_id,criado_em,estado,aulas(titulo)&order=criado_em.desc,id.desc&limit=26&offset=${offset}`,{servico:true});
 if(!r.ok||!Array.isArray(r.dados))throw Error();
 return json(res,200,{ok:true,mais:r.dados.length>25,tentativas:r.dados.slice(0,25).map(t=>({id:t.id,aula:t.aulas?.titulo||'AgoraQuiz',iniciada:t.criado_em,concluida:t.estado.finishedAt||null,acertos:E.score(t.estado),respondidas:t.estado.answers.length,questoes:content.questions.map((q,i)=>({numero:i+1,titulo:q.title,escolha:t.estado.answers[i]?.choice||null,correta:E.KEY[i],acertou:t.estado.answers[i]?t.estado.answers[i].choice===E.KEY[i]:null,leitura:t.estado.answers[i]?.readAt||null}))}))});
 }catch(e){return json(res,503,{ok:false,erro:'Não foi possível consultar as tentativas. Tente novamente.'});}
};
