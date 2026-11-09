/* O servidor autoriza cada reprodução; nenhuma chave fica no navegador. */
const PlayerCurso={
 async montar(alvo,{cursoId,aulaId,titulo='Videoaula',poster=''}={}){
  const mensagem=document.createElement('p');mensagem.textContent='Preparando seu vídeo…';mensagem.setAttribute('role','status');alvo.replaceChildren(mensagem);
  try{
   const query=new URLSearchParams(aulaId?{aula:aulaId}:{curso:cursoId});
   const r=await fetch('/api/video?'+query,{credentials:'same-origin',cache:'no-store'});const dados=await r.json();
   if(!r.ok||!dados.ok)throw Error(dados.erro||'Não foi possível abrir o vídeo.');
   const url=new URL(dados.url);if(url.protocol!=='https:'||!/^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(url.hostname))throw Error('Endereço de vídeo inválido.');
   const cor=getComputedStyle(document.body).getPropertyValue('--curso-destaque').trim();if(/^#[a-f0-9]{6}$/i.test(cor))url.searchParams.set('primaryColor',cor);
   url.searchParams.set('preload','none');
   if(poster){const imagem=new URL(poster,location.href);if(imagem.origin===location.origin)url.searchParams.set('poster',imagem.href);}
   const frame=document.createElement('iframe');frame.src=url.href;frame.title=titulo;frame.allow='accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.style.cssText='width:100%;height:100%;border:0;display:block';alvo.replaceChildren(frame);
  }catch(e){
   mensagem.textContent=e.message;const repetir=document.createElement('button');repetir.type='button';repetir.textContent='Tentar novamente';repetir.className='btn';repetir.addEventListener('click',()=>this.montar(alvo,{cursoId,aulaId,titulo,poster}));alvo.replaceChildren(mensagem,repetir);
  }
 }
};
