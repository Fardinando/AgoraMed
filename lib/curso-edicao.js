'use strict';
const { createHash } = require('crypto');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function falha(mensagem,status=400) { return Object.assign(new Error(mensagem),{status}); }
function validar(ed,removidos,operacao) {
  if (!ed || !UUID.test(ed.id||'')) throw falha('Identificação do curso inválida. Reabra o editor.');
  if (!Number.isInteger(ed.versao)||ed.versao<0||!UUID.test(operacao||'')) throw falha('Atualize a página e reabra o editor antes de salvar. Suas alterações foram mantidas.',409);
  if (!String(ed.titulo||'').trim()) throw falha('Informe o título do curso.');
  if (!['gratis','pago'].includes(ed.tipoAcesso)) throw falha('Escolha se o curso é gratuito ou pago.');
  if (ed.urlVendas) {
    try { const u=new URL(ed.urlVendas);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error(); }
    catch { throw falha('Informe uma página de vendas válida, começando com https://.'); }
  }
  if(!Array.isArray(ed.modulos))throw falha('A estrutura do curso está incompleta. Nenhuma alteração foi salva.');
  const ids=new Set([ed.id]);
  const conferir=id=>{if(!UUID.test(id||'')||ids.has(id))throw falha('Há identificadores inválidos ou repetidos no curso.');ids.add(id);};
  for(const m of ed.modulos){conferir(m.id);if(!Array.isArray(m.aulas))throw falha('Há um módulo incompleto. Nenhuma alteração foi salva.');for(const a of m.aulas){conferir(a.id);if(!Array.isArray(a.pdfs))throw falha('A lista de materiais está incompleta. Nenhuma alteração foi salva.');for(const p of a.pdfs)if(p.id)conferir(p.id);}}
  for(const tipo of ['modulos','aulas','materiais'])if(!Array.isArray(removidos?.[tipo])||removidos[tipo].some(id=>!UUID.test(id)))throw falha('Confirmações de remoção inválidas.');
}
function identificador(texto){const h=createHash('sha256').update(texto).digest();h[6]=(h[6]&15)|64;h[8]=(h[8]&63)|128;const s=h.toString('hex').slice(0,32);return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
function preparar(ed,anterior,operacao,{dataUrlParaBytes,baseUrl}){
  const arquivos=[];
  const atuais=new Map((anterior?.modulos||[]).flatMap(m=>(m.aulas||[]).flatMap(a=>(a.materiais||[]).map(p=>[p.id,p]))));
  const bytes=(valor)=>{const b=dataUrlParaBytes(valor);if(!b||!b.dados.length)throw falha('Um arquivo não pôde ser lido. Selecione-o novamente.');return b;};
  const curso={id:ed.id,titulo:String(ed.titulo).trim(),subtitulo:String(ed.subtitulo||'').trim(),categoria:String(ed.categoria||'').trim(),nivel:String(ed.nivel||'Básico'),descricao:String(ed.descricao||'').trim(),capa_emoji:String(ed.capaEmoji||'🩺').slice(0,8),capa_url:String(ed.capaImagem||''),tipo_acesso:ed.tipoAcesso,url_vendas:ed.urlVendas?new URL(ed.urlVendas).href:''};
  if(curso.capa_url.startsWith('data:')){
    const b=bytes(curso.capa_url);if(!['image/jpeg','image/png','image/webp'].includes(b.mime))throw falha('Escolha uma imagem JPEG, PNG ou WebP.');
    const hash=createHash('sha256').update(b.dados).digest('hex');const ext=b.mime==='image/png'?'png':b.mime==='image/webp'?'webp':'jpg';
    const caminho=`${ed.id}/${operacao}/${hash}.${ext}`;arquivos.push({bucket:'capas',caminho,...b});curso.capa_url=`${baseUrl}/storage/v1/object/public/capas/${caminho}`;
  }else if(curso.capa_url.includes('/storage/v1/object/public/capas/')&&curso.capa_url!==anterior?.capa_url){throw falha('Para substituir a capa, selecione um novo arquivo.');}
  curso.modulos=ed.modulos.map((m,i)=>({id:m.id,titulo:String(m.titulo||'').trim()||`Módulo ${i+1}`,ordem:i+1,aulas:m.aulas.map((a,j)=>({id:a.id,titulo:String(a.titulo||'').trim()||`Aula ${j+1}`,ordem:j+1,youtube_id:String(a.youtubeId||'').trim(),duracao:String(a.duracao||'').trim(),descricao:String(a.descricao||'').trim(),materiais:a.pdfs.map((p,k)=>{
    if(p.id){const existente=atuais.get(p.id);if(!existente)throw falha('Um material não corresponde à versão atual. Reabra o editor.',409);return {id:p.id,nome:existente.nome,caminho:existente.caminho};}
    const b=bytes(p.dados);if(b.mime!=='application/pdf'||b.dados.subarray(0,5).toString()!=='%PDF-')throw falha('Um dos materiais não é um PDF válido.');
    const hash=createHash('sha256').update(b.dados).digest('hex');const id=identificador(`${operacao}:${a.id}:${k}:${hash}`);const nome=String(p.nome||'material.pdf').replace(/[^\w.\- ()]+/g,'_').slice(0,120);const caminho=`${a.id}/${operacao}/${id}-${nome}`;
    arquivos.push({bucket:'materiais',caminho,...b});return {id,nome,caminho};
  })}))}));
  return {curso,arquivos};
}
module.exports={UUID,falha,validar,preparar};
