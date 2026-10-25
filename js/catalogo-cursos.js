/* Apenas a apresentação comercial de cursos ainda não liberados. */
const CatalogoCursos = (() => {
  function destino(curso) {
    const rota = '/api/curso?id=' + encodeURIComponent(curso.id);
    if (curso.acessoLiberado) return rota;
    try {
      const url = new URL(curso.urlVendas || '');
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? rota : null;
    } catch (e) { return null; }
  }
  function cartao(curso) {
    const href = destino(curso);
    const tag = href ? 'a' : 'div';
    return `<${tag} class="cartao-curso cartao-catalogo" ${href ? `href="${UI.escapar(href)}"` : 'aria-disabled="true"'}>
      <div class="capa">
        ${curso.capaImagem ? `<img src="${UI.escapar(curso.capaImagem)}" alt="">` : `<span class="emoji">${UI.escapar(curso.capaEmoji || '🎓')}</span>`}
        <span class="badge">Curso pago</span>
      </div>
      <div class="info-curso">
        <h3>${UI.escapar(curso.titulo)}</h3>
        <p class="descricao">${UI.escapar(curso.subtitulo || curso.descricao || '')}</p>
        <span class="catalogo-convite">${href ? 'Conheça o curso ↗' : 'Em breve'}</span>
      </div>
    </${tag}>`;
  }
  return { destino, cartao };
})();
