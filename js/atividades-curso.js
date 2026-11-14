window.AtividadesCurso = {
  mostrarNaNavegacao(curso, lista) {
    if (curso.id !== 'fa3c5d8d-94c4-4321-be7a-1cc45741a983') return;

    const atividades = [
      ['✓', 'AgoraQuiz', 'Estudo ou Simulado', 'agoraquiz-curso.html?curso_id=' + encodeURIComponent(curso.id)],
      ['Rx', 'AgoraPrescreva', 'Simulação de prescrição', 'agoraprescreva.html']
    ];
    const navegacao = document.createElement('nav');
    navegacao.className = 'atividades-curriculo';
    navegacao.setAttribute('aria-label', 'Atividades do curso');

    for (const [icone, titulo, descricao, href] of atividades) {
      const link = document.createElement('a');
      link.className = 'curso-atividade';
      link.href = href;
      link.innerHTML = `<span class="curso-atividade-selo" aria-hidden="true">${icone}</span>
        <span><strong>${titulo}</strong><em>${descricao}</em></span>
        <span class="curso-atividade-acao" aria-hidden="true">→</span>`;
      navegacao.append(link);
    }
    lista.after(navegacao);
  }
};
