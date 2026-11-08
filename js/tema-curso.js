/* Identidade por curso, compartilhada pela abertura, programa e aulas.
   Novos cursos podem acrescentar sua identidade neste catálogo. */
(function(raiz){
 const temas={
  violeta:'#b6a0f4',amarelo:'#e4ad48',vermelho:'#f47b80',celeste:'#8ab8ff',turquesa:'#65dce6'
 };
 function identificar(curso){
  if(!curso)return 'turquesa';
  const titulo=String(curso.titulo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(curso.id==='fa3c5d8d-94c4-4321-be7a-1cc45741a983'||/hiper[ck]alemia/.test(titulo))return 'violeta';
  if(/cetoacidose/.test(titulo))return 'amarelo';
  if(/gasometria/.test(titulo))return 'vermelho';
  if(/edema.*pulm/.test(titulo))return 'celeste';
  return 'turquesa';
 }
 function aplicar(curso,elemento){
  const tema=identificar(curso);elemento=elemento||document.body;
  elemento.dataset.temaCurso=tema;
  elemento.style.setProperty('--curso-destaque',temas[tema]);
  return tema;
 }
 const api={identificar,aplicar,temas};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else raiz.TemaCurso=api;
})(typeof window==='undefined'?{}:window);
