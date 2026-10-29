/* Ranking por curso, atualizado ao abrir a área de alunos e sob demanda. */
const RankingAlunos = (() => {
  let iniciado = false, pedido = 0;
  const el = id => document.getElementById(id);
  function sincronizarCursos() {
    const seletor = el('ranking-curso');
    const anterior = seletor.value;
    const cursos = Store.cursos();
    seletor.innerHTML = cursos.length ? cursos.map(c => `<option value="${UI.escapar(c.id)}">${UI.escapar(c.titulo)}</option>`).join('') : '<option value="">Nenhum curso cadastrado</option>';
    if (cursos.some(c => c.id === anterior)) seletor.value = anterior;
    seletor.disabled = !cursos.length;
    return seletor.value;
  }
  async function atualizar() {
    const id = sincronizarCursos();
    const atual = ++pedido;
    const lista = el('ranking-alunos-lista');
    const status = el('ranking-status');
    const botao = el('ranking-atualizar');
    lista.innerHTML = '';
    botao.disabled = true;
    status.textContent = id ? 'Consultando o progresso dos alunos…' : 'Crie um curso para acompanhar o ranking.';
    if (!id) { el('ranking-alunos').removeAttribute('aria-busy'); return; }
    el('ranking-alunos').setAttribute('aria-busy', 'true');
    try {
      const r = await Store.rankingAlunos(id);
      if (atual !== pedido) return;
      if (!r?.ok || !Array.isArray(r.ranking)) throw Error(r?.erro || 'Não foi possível carregar o ranking.');
      status.textContent = r.ranking.length ? `Maiores progressos em ${r.curso.titulo}.` : r.curso.total ? 'Ainda não há alunos ativos com aulas concluídas neste curso.' : 'Este curso ainda não tem aulas para calcular o progresso.';
      lista.innerHTML = r.ranking.map((a, i) => `<li class="ranking-aluno"><span class="ranking-posicao" aria-label="Posição ${i + 1}">${i + 1}º</span><div class="ranking-dados"><button type="button" data-progresso-aluno="${UI.escapar(a.id)}" aria-haspopup="dialog">${UI.escapar(a.nome)}</button><span>${a.feitas} de ${a.total} aulas concluídas</span><div class="barra-progresso" role="progressbar" aria-label="Progresso de ${UI.escapar(a.nome)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.percentual}"><span style="width:${a.percentual}%"></span></div></div><strong class="ranking-percentual">${a.percentual}%</strong></li>`).join('');
    } catch (e) {
      if (atual === pedido) status.textContent = e.message || 'Não foi possível carregar o ranking. Tente atualizar.';
    } finally {
      if (atual === pedido) { botao.disabled = false; el('ranking-alunos').removeAttribute('aria-busy'); }
    }
  }
  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    sincronizarCursos();
    el('ranking-atualizar').addEventListener('click', atualizar);
    el('ranking-curso').addEventListener('change', atualizar);
    el('filtro-curso-alunos').addEventListener('change', () => {
      const id = el('filtro-curso-alunos').value;
      if (Store.cursos().some(c => c.id === id)) { el('ranking-curso').value = id; atualizar(); }
    });
  }
  return { iniciar, atualizar };
})();
