/* Aceita IDs ou links conhecidos, sem carregar páginas nem executar URLs. */
(function(raiz){
 function identificar(valor,provedor){
  const texto=String(valor||'').trim();
  if(!/^https?:\/\//i.test(texto))return texto;
  try{
   const u=new URL(texto),host=u.hostname.toLowerCase();
   if(provedor==='cloudflare'&&(/^(customer-[a-z0-9]+\.)?cloudflarestream\.com$/.test(host)||/^(iframe\.)?videodelivery\.net$/.test(host))){const id=u.pathname.split('/').find(p=>/^[a-f0-9]{32}$/.test(p));return id||texto;}
   if(provedor==='youtube'){
    if(host==='youtu.be')return u.pathname.split('/')[1]||texto;
    if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host))return u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})(?:\/|$)/)?.[1]||texto;
   }
  }catch{}
  return texto;
 }
 if(typeof module==='object'&&module.exports)module.exports={identificar};else raiz.AdminVideo={identificar};
})(typeof window==='undefined'?{}:window);
