/* Diagnóstico sem segredos: usado antes de abrir as matrículas reais. */
'use strict';
const {json,exigirAdmin}=require('../../api');
const mp=require('../../mercado-pago-producao');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return json(res,405,{ok:false});
 if(!await exigirAdmin(req,res))return;
 if(!mp.credenciaisProntas())return json(res,503,{ok:false,credenciaisProntas:false});
 try{await mp.vendedor();return json(res,200,{ok:true,credenciaisProntas:true,contaRealValidada:true,vendasHabilitadas:mp.vendasAtivas()});}
 catch{return json(res,503,{ok:false,credenciaisProntas:true,contaRealValidada:false});}
};
