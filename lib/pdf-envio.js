/* Comprovantes de upload têm chave derivada e não são cookies de sessão. */
'use strict';
const {createHmac, timingSafeEqual}=require('node:crypto');
const {UUID,falha}=require('./curso-edicao');
const LIMITE_PDF=50_000_000;
function chave(){if(!process.env.JWT_SECRET)throw falha('Configuração de envio indisponível.',503);return createHmac('sha256',process.env.JWT_SECRET).update('agoramed:pdf-upload:v1').digest();}
function assinar(dados){const corpo=Buffer.from(JSON.stringify({...dados,exp:Date.now()+18*3600*1000})).toString('base64url');return corpo+'.'+createHmac('sha256',chave()).update(corpo).digest('base64url');}
function conferir(token,escopo){
 try{
  if(typeof token!=='string'||token.length>4096)throw Error();
  const [corpo,sig,extra]=token.split('.');if(extra||!corpo||!sig)throw Error();
  const esperado=createHmac('sha256',chave()).update(corpo).digest();const recebido=Buffer.from(sig,'base64url');
  if(recebido.length!==esperado.length||!timingSafeEqual(recebido,esperado))throw Error();
  const d=JSON.parse(Buffer.from(corpo,'base64url').toString());
  if(d.exp<=Date.now()||!Number.isFinite(d.exp)||!UUID.test(d.id)||d.adminId!==escopo.adminId||d.cursoId!==escopo.cursoId||d.aulaId!==escopo.aulaId||!Number.isInteger(d.tamanho)||d.tamanho<5||d.tamanho>LIMITE_PDF||d.caminho!==`${d.aulaId}/envios/${d.id}.pdf`)throw Error();
  return d;
 }catch{throw falha('O envio de um PDF é inválido ou expirou. Remova esse anexo e selecione o arquivo novamente.');}
}
async function conferirArquivo(d,env,fetcher=fetch){
 /* Somente os cinco primeiros bytes passam pela função; o PDF completo vai direto ao Storage. */
 const r=await fetcher(`${env.SUPABASE_URL}/storage/v1/object/materiais/${d.caminho}`,{headers:{apikey:env.SERVICE_KEY,Authorization:`Bearer ${env.SERVICE_KEY}`,Range:'bytes=0-4'},signal:AbortSignal.timeout(15000)});
 try{
  if(!r.ok)throw falha('O envio do PDF não foi concluído. Selecione o arquivo novamente.');
  const total=r.status===206?Number((r.headers.get('content-range')||'').match(/^bytes 0-4\/(\d+)$/)?.[1]):Number(r.headers.get('content-length'));
  if(total!==d.tamanho||total>LIMITE_PDF||r.headers.get('content-type')?.split(';')[0]!=='application/pdf')throw falha('O tamanho ou o formato do PDF enviado não corresponde ao arquivo selecionado.');
  const leitor=r.body.getReader();let prefixo=Buffer.alloc(0);
  try{while(prefixo.length<5){const {done,value}=await leitor.read();if(done)break;prefixo=Buffer.concat([prefixo,Buffer.from(value).subarray(0,5-prefixo.length)]);}}finally{await leitor.cancel();}
  if(prefixo.toString()!=='%PDF-')throw falha('Um dos materiais não é um PDF válido.');
 }finally{if(r.body&&!r.body.locked)await r.body.cancel().catch(()=>{});}
}
async function conferirEnvios(ed,adminId,env,{fetcher=fetch}={}){
 const materiais=new Map(),ids=new Set();
 for(const m of ed.modulos)for(const a of m.aulas)for(const p of a.pdfs){
  if(!p.envio)continue;
  if(p.id||p.dados)throw falha('Um anexo possui informações de envio incompatíveis.');
  const d=conferir(p.envio,{adminId,cursoId:ed.id,aulaId:a.id});
  if(ids.has(d.id))throw falha('Um PDF foi repetido na mesma solicitação.');ids.add(d.id);
  await conferirArquivo(d,env,fetcher);materiais.set(p.envio,{id:d.id,nome:d.nome,caminho:d.caminho});
 }
 return materiais;
}
module.exports={LIMITE_PDF,assinar,conferir,conferirArquivo,conferirEnvios};
