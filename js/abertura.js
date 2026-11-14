/* A abertura usa apenas os cursos autorizados pelo servidor e não altera o progresso. */
(async()=>{
 await Store.iniciar({atualizar:true});const usuario=Store.proteger();if(!usuario)return;
 const id=new URLSearchParams(location.search).get('id');const curso=Store.acharCurso(id);
 const $=id=>document.getElementById(id),esc=UI.escapar;
 if(!curso||!curso.abertura){$('ab-estado').textContent='Esta abertura não está disponível para sua conta.';return;}
 TemaCurso.aplicar(curso);
 if(curso.id==='fa3c5d8d-94c4-4321-be7a-1cc45741a983'){
  $('ab-agoraquiz').classList.remove('oculto');
  $('ab-agoraprescreva').classList.remove('oculto');
 }
 $('ab-estado').classList.add('oculto');$('ab-layout').classList.remove('oculto');
 document.title=`Comece por aqui — ${curso.titulo} | AgoraMed`;
 $('ab-avatar').textContent=UI.iniciais(usuario.nome);$('ab-curso').textContent=curso.titulo;
 const est=Store.estatisticasCurso(curso);$('ab-resumo').textContent=`${est.modulos} módulos · ${est.aulas} aulas`;
 const visao='curso.html?id='+encodeURIComponent(curso.id);$('ab-visao').href=visao;
 const link=(m,a)=>`aula.html?${new URLSearchParams({c:curso.id,m:m.id,a:a.id})}`;
 $('ab-modulos').innerHTML=curso.modulos.map((m,i)=>`<details class="ab-modulo"><summary><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(m.titulo)}</strong><span aria-hidden="true">⌄</span></summary><ul>${m.aulas.map((a,j)=>`<li><a href="${esc(link(m,a))}">${j+1}. ${esc(a.titulo)}</a></li>`).join('')}</ul></details>`).join('');
 const video=curso.abertura.youtubeId?.trim();
 if(curso.abertura.streamUid){
  await PlayerCurso.montar($('ab-player'),{cursoId:curso.id,titulo:'Boas-vindas e orientação do curso',poster:curso.id==='fa3c5d8d-94c4-4321-be7a-1cc45741a983'?'img/hipercalemia-boas-vindas.png':''});
 }else if(video&&/^[a-zA-Z0-9_-]{11}$/.test(video)){
  const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}?rel=0&playsinline=1`;frame.title='Boas-vindas e orientação do curso';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';frame.allowFullscreen=true;$('ab-player').append(frame);
 }else $('ab-player').innerHTML='<div class="ab-video-vazio"><span aria-hidden="true">▷</span><h3>Conheça a plataforma</h3><p>O vídeo de boas-vindas estará disponível em breve.</p><small>Você já pode baixar o e-book e iniciar seus estudos.</small></div>';
 if(usuario.papel==='admin')$('ab-editar').classList.remove('oculto');
 const materiais=curso.modulos.flatMap(m=>m.aulas.flatMap(a=>a.pdfs||[]));
 const ebook=materiais.find(p=>/hipercalemia-material-completo-revisado|e-?book/i.test(p.nome));
 if(ebook){$('ab-download').href='/api/material?id='+encodeURIComponent(ebook.id);$('ab-download').classList.remove('oculto');}else $('ab-pdf-pendente').classList.remove('oculto');
 $('ab-ebook-meta').textContent=`PDF · 113 páginas · ${est.aulas} aulas`;
 const referencias=[
  ['Causas e avaliação da hipercalemia','https://www.uptodate.com/contents/causes-and-evaluation-of-hyperkalemia-in-adults','Causes and evaluation of hyperkalemia in adults - UpToDate.pdf'],
  ['Manifestações clínicas','https://www.uptodate.com/contents/clinical-manifestations-of-hyperkalemia-in-adults','Clinical manifestations of hyperkalemia in adults - UpToDate.pdf'],
  ['Tratamento em adultos','https://pathways.uptodate.com/decision-tree/131204','Hyperkalemia: Treatment in adults.pdf'],
  ['Tratamento e prevenção','https://www.uptodate.com/contents/treatment-and-prevention-of-hyperkalemia-in-adults','Treatment and prevention of hyperkalemia in adults - UpToDate.pdf']
 ];
 $('ab-referencias').innerHTML=referencias.map(([t,url,nome])=>{
  const pdf=materiais.find(p=>p.nome===nome);
  return `<li><div class="ab-ref-titulo">${esc(t)} <small>UpToDate</small></div><div class="ab-ref-acoes"><a href="${url}" target="_blank" rel="noopener" aria-label="Consultar ${esc(t)} no site">Consultar ↗</a>${pdf?`<a class="ab-ref-pdf" href="/api/material?id=${encodeURIComponent(pdf.id)}" aria-label="Baixar PDF: ${esc(t)}">↓ Baixar PDF</a>`:''}</div></li>`;
 }).join('');
 const primeiro=curso.modulos.find(m=>m.aulas.length);$('ab-iniciar').href=primeiro?link(primeiro,primeiro.aulas[0]):visao;
})();
