/* Apresentação dos cursos: perfil de acesso e disponibilidade são avisos distintos. */
const CatalogoCursos = (() => {
  function estado(curso, usuario = {}, estatisticas = {}) {
    const emProducao = Number.isInteger(estatisticas.aulas) ? estatisticas.aulas === 0
      : typeof curso.emProducao === 'boolean' ? curso.emProducao
      : Array.isArray(curso.modulos) && !curso.modulos.some(m => (m.aulas || []).length);
    const professor = usuario.papel === 'admin';
    return {
      emProducao,
      etiqueta: professor ? 'Acesso do professor' : emProducao ? 'Em produção' : curso.tipoAcesso === 'gratis' ? 'Curso gratuito' : 'Acesso liberado',
      acaoVazia: professor ? 'Ver estrutura do curso' : 'Aulas em breve',
    };
  }
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
    const emProducao = estado(curso).emProducao;
    const tag = href ? 'a' : 'div';
    return `<${tag} class="cartao-curso cartao-catalogo" ${href ? `href="${UI.escapar(href)}"` : 'aria-disabled="true"'}>
      <div class="capa">
        ${curso.capaImagem ? `<img src="${UI.escapar(curso.capaImagem)}" alt="">` : `<span class="emoji">${UI.escapar(curso.capaEmoji || '🎓')}</span>`}
        <span class="badge">${emProducao ? 'Em produção' : 'Curso pago'}</span>
      </div>
      <div class="info-curso">
        <h3>${UI.escapar(curso.titulo)}</h3>
        <p class="descricao">${UI.escapar(curso.subtitulo || curso.descricao || '')}</p>
        <span class="catalogo-convite">${emProducao ? 'Em breve disponível' : href ? 'Conheça o curso ↗' : 'Em breve'}</span>
      </div>
    </${tag}>`;
  }
  return { destino, cartao, estado };
})();
