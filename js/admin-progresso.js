/* Progresso por aluno, consultado novamente ao abrir ou atualizar a janela. */
const ProgressoAlunos = (() => {
  function iniciar() {
    const dialog = document.getElementById('dialog-progresso-aluno');
    const titulo = document.getElementById('progresso-aluno-titulo');
    const email = document.getElementById('progresso-aluno-email');
    const conteudo = document.getElementById('progresso-aluno-conteudo');
    const atualizar = document.getElementById('progresso-aluno-atualizar');
    let alunoId = null;
    let pedido = 0;

    async function carregar(uid) {
      const aluno = Store.usuarios().find(u => u.id === uid && u.papel !== 'admin');
      if (!aluno) return;
      alunoId = uid;
      const atual = ++pedido;
      titulo.textContent = `Progresso de ${aluno.nome}`;
      email.textContent = aluno.email;
      conteudo.innerHTML = '<p class="progresso-aluno-aviso">Carregando progresso…</p>';
      atualizar.disabled = true;
      if (!dialog.open) dialog.showModal();
      try {
        const r = await Store.progressoAluno(uid);
        if (atual !== pedido || !dialog.open) return;
        if (!r || !r.ok || !Array.isArray(r.cursos)) {
          conteudo.innerHTML = `<div class="aviso erro" role="alert">${UI.escapar(r && r.erro || 'Não foi possível consultar o progresso. Tente atualizar.')}</div>`;
          return;
        }
        if (!r.cursos.length) {
          conteudo.innerHTML = '<p class="progresso-aluno-aviso">Este aluno ainda não está matriculado em nenhum curso.</p>';
          return;
        }
        conteudo.innerHTML = r.cursos.map(c => `
          <section class="progresso-aluno-curso" aria-label="${UI.escapar(c.titulo)}">
            <div class="progresso-aluno-curso-cab">
              <h3>${UI.escapar(c.titulo)}</h3>
              <strong>${c.percentual}%</strong>
            </div>
            <div class="barra-progresso" role="progressbar" aria-label="Progresso em ${UI.escapar(c.titulo)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.percentual}">
              <span style="width:${c.percentual}%"></span>
            </div>
            <p>${c.total ? `${c.feitas} de ${c.total} aulas concluídas${c.feitas === c.total ? ' · Curso concluído' : ''}` : 'Este curso ainda não tem aulas.'}</p>
          </section>`).join('');
      } catch (e) {
        if (atual === pedido && dialog.open)
          conteudo.innerHTML = '<div class="aviso erro" role="alert">Não foi possível consultar o progresso. Tente atualizar.</div>';
      } finally {
        if (atual === pedido) atualizar.disabled = false;
      }
    }

    const abrirPeloNome = e => {
      const botao = e.target.closest('[data-progresso-aluno]');
      if (botao) carregar(botao.dataset.progressoAluno);
    };
    document.getElementById('lista-alunos').addEventListener('click', abrirPeloNome);
    document.getElementById('ranking-alunos-lista')?.addEventListener('click', abrirPeloNome);
    atualizar.addEventListener('click', () => { if (alunoId) carregar(alunoId); });
    document.getElementById('progresso-aluno-fechar').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { pedido++; alunoId = null; atualizar.disabled = false; });
  }
  return { iniciar };
})();
