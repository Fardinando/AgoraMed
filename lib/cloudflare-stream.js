'use strict';
const {createPrivateKey,sign}=require('node:crypto');
const UID=/^[a-f0-9]{32}$/;
function assinarVideo(uid,{keyId=process.env.CLOUDFLARE_STREAM_KEY_ID,pem=process.env.CLOUDFLARE_STREAM_PRIVATE_KEY,customer=process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE,agora=Math.floor(Date.now()/1000)}={}){
 if(!UID.test(uid||''))throw Error('Vídeo inválido.');
 if(!/^[a-f0-9]{32}$/.test(keyId||'')||!pem||!/^[a-z0-9]+$/.test(customer||''))throw Error('Stream não configurado.');
 const privado=createPrivateKey(pem.includes('-----BEGIN')?pem.replace(/\\n/g,'\n'):Buffer.from(pem,'base64'));
 const exp=agora+3*60*60;
 const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const corpo=b64({alg:'RS256',kid:keyId})+'.'+b64({sub:uid,kid:keyId,exp,nbf:agora-30,downloadable:false});
 const token=corpo+'.'+sign('RSA-SHA256',Buffer.from(corpo),privado).toString('base64url');
 return {url:`https://customer-${customer}.cloudflarestream.com/${token}/iframe`,expiraEm:exp};
}
module.exports={UID,assinarVideo};
