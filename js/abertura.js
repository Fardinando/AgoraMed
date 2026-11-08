/* A abertura usa apenas os cursos autorizados pelo servidor e não altera o progresso. */
(async()=>{
 await Store.iniciar({atualizar:true});const usuario=Store.proteger();if(!usuario)return;
 const id=new URLSearchParams(location.search).get('id');const curso=Store.acharCurso(id);
 const $=id=>document.getElementById(id),esc=UI.escapar;
 if(!curso||!curso.abertura){$('ab-estado').textContent='Esta abertura não está disponível para sua conta.';return;}
 $('ab-estado').classList.add('oculto');$('ab-layout').classList.remove('oculto');
 document.title=`Comece por aqui — ${curso.titulo} | AgoraMed`;
 $('ab-avatar').textContent=UI.iniciais(usuario.nome);$('ab-curso').textContent=curso.titulo;
 const est=Store.estatisticasCurso(curso);$('ab-resumo').textContent=`${est.modulos} módulos · ${est.aulas} aulas`;
 const visao='curso.html?id='+encodeURIComponent(curso.id);$('ab-visao').href=visao;
 const link=(m,a)=>`aula.html?${new URLSearchParams({c:curso.id,m:m.id,a:a.id})}`;
 $('ab-modulos').innerHTML=curso.modulos.map((m,i)=>`<details class="ab-modulo"><summary><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(m.titulo)}</strong><span aria-hidden="true">⌄</span></summary><ul>${m.aulas.map((a,j)=>`<li><a href="${esc(link(m,a))}">${j+1}. ${esc(a.titulo)}</a></li>`).join('')}</ul></details>`).join('');
 const video=curso.abertura.youtubeId?.trim();
 if(video&&/^[a-zA-Z0-9_-]{11}$/.test(video)){
  const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}?rel=0&playsinline=1`;frame.title='Boas-vindas e orientação do curso';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';frame.allowFullscreen=true;$('ab-player').append(frame);
 }else $('ab-player').innerHTML='<div class="ab-video-vazio"><span aria-hidden="true">▷</span><h3>Conheça a plataforma</h3><p>O vídeo de boas-vindas estará disponível em breve.</p><small>Você já pode baixar o e-book e iniciar seus estudos.</small></div>';
 if(usuario.papel==='admin')$('ab-editar').classList.remove('oculto');
 const materiais=curso.modulos.flatMap(m=>m.aulas.flatMap(a=>a.pdfs||[]));
 const ebook=materiais.find(p=>/hipercalemia-material-completo-revisado|e-?book/i.test(p.nome));
 if(ebook){$('ab-download').href='/api/material?id='+encodeURIComponent(ebook.id);$('ab-download').classList.remove('oculto');}else $('ab-pdf-pendente').classList.remove('oculto');
 $('ab-ebook-meta').textContent=`PDF · 113 páginas · ${est.aulas} aulas`;
 const referencias=[['Causas e avaliação da hipercalemia','https://www.uptodate.com/contents/causes-and-evaluation-of-hyperkalemia-in-adults'],['Manifestações clínicas','https://www.uptodate.com/contents/clinical-manifestations-of-hyperkalemia-in-adults'],['Tratamento em adultos','https://pathways.uptodate.com/decision-tree/131204'],['Tratamento e prevenção','https://www.uptodate.com/contents/treatment-and-prevention-of-hyperkalemia-in-adults']];
 $('ab-referencias').innerHTML=referencias.map(([t,url])=>`<li><a href="${url}" target="_blank" rel="noopener"><span>${esc(t)} <small>UpToDate</small></span><strong>Consultar ↗</strong></a></li>`).join('');
 const primeiro=curso.modulos.find(m=>m.aulas.length);$('ab-iniciar').href=primeiro?link(primeiro,primeiro.aulas[0]):visao;
})();
