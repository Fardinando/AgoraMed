/* Meu Caderno de Erros — lista, indicadores e revisão.
   O gabarito continua no servidor: a revisão só o recebe depois da confirmação. */
(function () {
  'use strict';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  function prose(s) {
    return String(s || '').split(/\n\s*\n/).filter(Boolean)
      .map((p) => '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>').join('');
  }
  function refs(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  /* Tabela laboratorial: legível em telas pequenas por meio de rolagem própria. */
  function tabela(t) {
    if (!t || !Array.isArray(t.rows) || !t.rows.length) return '';
    const cabecalho = Array.isArray(t.headers) && t.headers.length
      ? '<thead><tr>' + t.headers.map((h) => '<th scope="col">' + inline(h) + '</th>').join('') + '</tr></thead>'
      : '';
    const corpo = '<tbody>' + t.rows.map((linha) => '<tr>' +
      (Array.isArray(linha) ? linha : []).map((celula, i) => i === 0
        ? '<th scope="row">' + inline(celula) + '</th>'
        : '<td>' + inline(celula) + '</td>').join('') + '</tr>').join('') + '</tbody>';
    const legenda = t.caption ? '<caption>' + inline(t.caption) + '</caption>' : '';
    return '<div class="aq-table-wrap" role="region" tabindex="0" aria-label="' +
      esc(t.caption || 'Tabela de exames') + '"><table class="aq-table">' + legenda + cabecalho + corpo + '</table></div>';
  }
  /* Enunciado completo: texto, tabela de exames e o trecho posterior à tabela. */
  function enunciado(q) {
    return prose(q.stem) + tabela(q.table) + (q.stemAfter ? prose(q.stemAfter) : '');
  }
  function data(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    try { return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return d.toLocaleString('pt-BR'); }
  }
  function uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function plural(n, um, muitos) { return Number(n) === 1 ? um : muitos; }

  const lista = document.getElementById('cd-list');
  const resumo = document.getElementById('cd-summary');
  const caixaErro = document.getElementById('cd-error');
  const dialogo = document.getElementById('cd-review');
  const corpoDialogo = document.getElementById('cd-review-body');

  let dados = { itens: [], indicadores: {}, estados: [], dominioAcertos: 2 };
  let filtro = 'todos';
  let revisaoAtual = null;
  let escolha = null;
  let busy = false;

  async function pedir(metodo, params, corpo) {
    const url = '/api/agoraquest-caderno' + (params ? '?' + params.toString() : '');
    const opcoes = { method: metodo, credentials: 'same-origin', cache: 'no-store' };
    if (corpo) {
      opcoes.headers = { 'Content-Type': 'application/json' };
      opcoes.body = JSON.stringify(corpo);
    }
    const res = await fetch(url, opcoes);
    let json = null;
    try { json = await res.json(); } catch { /* resposta sem JSON */ }
    if (!res.ok || !json || !json.ok) {
      const erro = new Error((json && json.erro) || 'Não foi possível concluir a operação.');
      erro.status = res.status;
      throw erro;
    }
    return json;
  }

  function aulaUrl(item) {
    if (item && item.curso && item.curso.id && item.modulo && item.modulo.id && item.aula && item.aula.id)
      return 'aula.html?c=' + encodeURIComponent(item.curso.id) +
        '&m=' + encodeURIComponent(item.modulo.id) + '&a=' + encodeURIComponent(item.aula.id);
    return 'app.html';
  }

  function rotuloEstado(item) {
    return item.estadoRotulo || item.estado || 'Precisa revisar';
  }

  /* ------------------------------------------------------------ resumo */
  function renderResumo() {
    const ind = dados.indicadores || {};
    const total = Number(ind.total) || 0;
    if (!total) { resumo.innerHTML = ''; return; }
    resumo.innerHTML = '<div class="aq-stats">' +
      '<div class="aq-stat"><strong>' + total + '</strong><span>Questões</span></div>' +
      '<div class="aq-stat"><strong>' + (Number(ind.precisaRevisar) || 0) + '</strong><span>Precisam revisar</span></div>' +
      '<div class="aq-stat"><strong>' + (Number(ind.emRevisao) || 0) + '</strong><span>Em revisão</span></div>' +
      '<div class="aq-stat"><strong>' + (Number(ind.dominadas) || 0) + '</strong><span>Dominadas</span></div>' +
      '</div>' +
      '<p class="cd-total">Domínio: <strong>' + (Number(ind.percentualDominio) || 0) + '%</strong> · ' +
      '<strong>' + (Number(ind.revisoes) || 0) + '</strong> ' + plural(ind.revisoes, 'revisão realizada', 'revisões realizadas') + '</p>';
  }

  /* ------------------------------------------------------------- lista */
  function agrupar(itens) {
    const cursos = new Map();
    for (const item of itens) {
      const ck = (item.curso && item.curso.id) || 'sem-curso';
      if (!cursos.has(ck)) cursos.set(ck, { id: item.curso && item.curso.id, titulo: (item.curso && item.curso.titulo) || 'Curso', modulos: new Map() });
      const curso = cursos.get(ck);
      const mk = (item.modulo && item.modulo.id) || 'sem-modulo';
      if (!curso.modulos.has(mk)) curso.modulos.set(mk, { id: item.modulo && item.modulo.id, titulo: (item.modulo && item.modulo.titulo) || 'Módulo', ordem: (item.modulo && item.modulo.ordem) || 0, aulas: new Map() });
      const modulo = curso.modulos.get(mk);
      const ak = (item.aula && item.aula.id) || 'sem-aula';
      if (!modulo.aulas.has(ak)) modulo.aulas.set(ak, { id: item.aula && item.aula.id, titulo: (item.aula && item.aula.titulo) || 'Aula', ordem: (item.aula && item.aula.ordem) || 0, itens: [] });
      modulo.aulas.get(ak).itens.push(item);
    }
    const porOrdem = (a, b) => (a.ordem || 0) - (b.ordem || 0) || a.titulo.localeCompare(b.titulo, 'pt-BR');
    return [...cursos.values()].map((c) => ({
      id: c.id,
      titulo: c.titulo,
      modulos: [...c.modulos.values()].sort(porOrdem).map((m) => ({
        id: m.id,
        titulo: m.titulo,
        aulas: [...m.aulas.values()].sort(porOrdem).map((a) => ({
          id: a.id,
          titulo: a.titulo,
          itens: a.itens.slice().sort((x, y) => x.numero - y.numero)
        }))
      }))
    })).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }

  function itemHTML(item) {
    const erros = Number(item.erros) || 0;
    const revisoes = Number(item.revisoes) || 0;
    return '<article class="aq-notebook-item">' +
      '<div class="aq-notebook-top"><p class="aq-eyebrow">QUESTÃO ' + esc(item.numero) + '</p>' +
      '<span class="aq-state ' + esc(item.estado) + '">' + esc(rotuloEstado(item)) + '</span></div>' +
      '<h3>' + esc(item.title) + '</h3>' +
      '<p class="cd-item-meta"><strong>' + esc(erros) + '</strong> ' + plural(erros, 'erro', 'erros') +
      ' · <strong>' + esc(revisoes) + '</strong> ' + plural(revisoes, 'revisão', 'revisões') +
      (item.ultimoErroEm ? ' · último erro em ' + esc(data(item.ultimoErroEm)) : '') + '</p>' +
      '<div class="aq-actions">' +
      '<button type="button" class="aq-btn primary compact" data-review="' + esc(item.questaoId) + '">Revisar questão →</button>' +
      '<a class="aq-btn ghost compact" href="' + esc(aulaUrl(item)) + '">Ir para a aula</a>' +
      '</div></article>';
  }

  function renderLista() {
    lista.setAttribute('aria-busy', 'false');
    const itens = Array.isArray(dados.itens) ? dados.itens : [];
    if (!itens.length) {
      lista.innerHTML = '<div class="cd-vazio"><h2>Nenhum erro registrado ainda.</h2>' +
        '<p>Quando você errar uma questão do AgoraQuest, ela aparece aqui para revisão direcionada.</p>' +
        '<a class="aq-btn primary" href="app.html">Voltar aos meus cursos</a></div>';
      return;
    }

    const ind = dados.indicadores || {};
    const opcoes = [{ estado: 'todos', rotulo: 'Todas', count: itens.length }].concat(
      (dados.estados && dados.estados.length ? dados.estados : [
        { estado: 'precisa_revisar', rotulo: 'Precisa revisar' },
        { estado: 'em_revisao', rotulo: 'Em revisão' },
        { estado: 'dominada', rotulo: 'Dominada' }
      ]).map((e) => ({
        estado: e.estado,
        rotulo: e.rotulo,
        count: e.estado === 'precisa_revisar' ? Number(ind.precisaRevisar) || 0
          : e.estado === 'em_revisao' ? Number(ind.emRevisao) || 0
            : Number(ind.dominadas) || 0
      }))
    );

    const toolbar = '<div class="cd-toolbar"><div class="cd-filtros" role="group" aria-label="Filtrar questões por estado">' +
      opcoes.map((o) => '<button type="button" class="cd-filtro" data-filter="' + esc(o.estado) + '"' +
        (filtro === o.estado ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        esc(o.rotulo) + '<span class="cd-count">' + esc(o.count) + '</span></button>').join('') +
      '</div></div>';

    const visiveis = filtro === 'todos' ? itens : itens.filter((i) => i.estado === filtro);
    if (!visiveis.length) {
      lista.innerHTML = toolbar + '<div class="cd-vazio">Nenhuma questão neste estado no momento.</div>';
      return;
    }

    const grupos = agrupar(visiveis);
    lista.innerHTML = toolbar + grupos.map((curso) => '<section class="cd-curso">' +
      '<h2>' + esc(curso.titulo) + '</h2><p class="cd-curso-sub">Curso</p>' +
      curso.modulos.map((modulo) => '<section class="cd-modulo">' +
        '<h3>' + esc(modulo.titulo) + '</h3>' +
        modulo.aulas.map((aula) => '<section class="cd-aula">' +
          '<div class="cd-aula-cab"><h4>' + esc(aula.titulo) + '</h4>' +
          '<a href="' + esc(aulaUrl({ curso, modulo, aula })) + '">Abrir aula →</a></div>' +
          '<div class="cd-itens">' + aula.itens.map(itemHTML).join('') + '</div>' +
          '</section>').join('') +
        '</section>').join('') +
      '</section>').join('');
  }

  /* ----------------------------------------------------------- revisão */
  function abrirDialogo() {
    if (!dialogo || dialogo.open) return;
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  }
  function fecharDialogo() {
    if (!dialogo) return;
    if (typeof dialogo.close === 'function') dialogo.close();
    else dialogo.removeAttribute('open');
    if (new URLSearchParams(location.search).get('questao')) {
      try { history.replaceState(null, '', 'caderno-erros.html'); } catch { /* ambiente sem history */ }
    }
  }

  function opcoesHTML(revisao) {
    return '<fieldset class="aq-options" aria-label="Alternativas">' +
      '<legend class="sr-only">Escolha uma alternativa</legend>' +
      ['A', 'B', 'C', 'D'].map((letra) => '<label class="aq-option">' +
        '<input type="radio" name="cd-choice" value="' + letra + '">' +
        '<span class="aq-letter">' + letra + '</span>' +
        '<span>' + esc(revisao.choices[letra]) + '</span></label>').join('') +
      '</fieldset>';
  }

  function renderPergunta(revisao) {
    revisaoAtual = revisao;
    escolha = null;
    const origem = aulaUrl(revisao);
    corpoDialogo.innerHTML = '<div class="cd-review-question">' +
      '<div id="cd-review-error" class="aq-alert" role="alert" hidden></div>' +
      '<div class="cd-review-head"><span class="cd-review-progress">QUESTÃO ' + esc(revisao.numero) + '</span>' +
      '<span class="aq-state ' + esc(revisao.estado) + '">' + esc(rotuloEstado(revisao)) + '</span></div>' +
      (revisao.competency ? '<p class="aq-eyebrow">' + esc(revisao.competency) + '</p>' : '') +
      '<h2>' + esc(revisao.title) + '</h2>' +
      '<div class="cd-review-stem">' + enunciado(revisao) + '</div>' +
      opcoesHTML(revisao) +
      '<p class="aq-selection" data-selection>Selecione uma alternativa para confirmar.</p>' +
      '<div class="cd-review-actions">' +
      '<button type="button" class="aq-btn primary" data-review-confirm disabled>Confirmar resposta</button>' +
      '<button type="button" class="aq-btn ghost" data-close>Voltar ao caderno</button>' +
      '</div>' +
      '<p class="cd-nota">O gabarito e o comentário aparecem somente depois da confirmação.</p>' +
      '<p class="cd-origem">Origem: <a href="' + esc(origem) + '">' + esc(revisao.curso && revisao.curso.titulo || 'Curso') +
      ' · ' + esc(revisao.aula && revisao.aula.titulo || 'Aula') + '</a></p>' +
      '</div>';
  }

  function erroRevisao(mensagem) {
    const alvo = document.getElementById('cd-review-error');
    if (!alvo) return;
    alvo.hidden = false;
    alvo.innerHTML = '<p>' + esc(mensagem) + '</p>';
  }

  async function abrirRevisao(questaoId) {
    if (!dialogo || !corpoDialogo) return;
    corpoDialogo.innerHTML = '<p class="aq-muted">Carregando a questão…</p>';
    abrirDialogo();
    try {
      const r = await pedir('GET', new URLSearchParams({ revisao: questaoId }));
      if (!r.revisao) throw new Error('Questão indisponível.');
      renderPergunta(r.revisao);
    } catch (e) {
      corpoDialogo.innerHTML = '<div class="aq-alert"><p>' + esc(e.message) + '</p>' +
        '<div class="aq-actions"><button type="button" class="aq-btn ghost compact" data-close>Fechar</button></div></div>';
    }
  }

  function renderResultado(dadosRevisao) {
    const r = dadosRevisao.resultado || {};
    const ok = !!r.correta;
    const item = dadosRevisao.item || revisaoAtual;
    const analise = ['A', 'B', 'C', 'D'].map((letra) => {
      const correta = letra === r.correctChoice;
      const escolhida = letra === r.escolha;
      const rotulo = correta ? 'Correta' : escolhida ? 'Sua escolha' : 'Alternativa ' + letra;
      return '<div class="aq-alt' + (correta ? ' correct' : '') + (escolhida && !correta ? ' chosen' : '') + '">' +
        '<div class="aq-alt-head"><span class="aq-letter">' + letra + '</span><span>' + rotulo + '</span></div>' +
        '<p>' + esc((r.feedback && r.feedback[letra]) || '') + '</p></div>';
    }).join('');

    corpoDialogo.innerHTML = '<section class="aq-feedback' + (ok ? '' : ' wrong') + '" aria-live="polite">' +
      '<p class="aq-answer">SUA RESPOSTA: ' + esc(r.escolha) + ' · ' + (ok ? 'CORRETA' : 'INCORRETA') + '</p>' +
      '<h3>' + (ok ? 'Resposta correta.' : 'Vale revisar este ponto.') + '</h3>' +
      '<div class="aq-explanation">' + prose(r.correctExplanation) + '</div>' +
      '<details class="aq-analysis" open><summary>Análise das quatro alternativas</summary>' + analise + '</details>' +
      '<div class="aq-pearl"><strong>PÉROLA DO PLANTÃO</strong><p>' + esc(r.pearl) + '</p></div>' +
      '<p class="aq-ref"><strong>Referência:</strong> ' + refs(r.reference) + '</p>' +
      '<p class="cd-nota">Estado: <strong>' + esc(r.estadoRotulo || rotuloEstado(item)) + '</strong>' +
      ' · Acertos consecutivos: <strong>' + esc(Number(r.acertosSeguidos) || 0) + ' de ' + esc(Number(r.dominioAcertos) || 2) + '</strong>' +
      ' · Revisões: <strong>' + esc(Number(r.revisoes) || 0) + '</strong></p>' +
      '<div class="cd-review-actions">' +
      '<button type="button" class="aq-btn ghost" data-close>Voltar ao caderno</button>' +
      '<button type="button" class="aq-btn ghost" data-review-again="' + esc(item.questaoId) + '">Revisar novamente</button>' +
      '<a class="aq-btn primary" href="' + esc(aulaUrl(item)) + '">Ir para a aula →</a>' +
      '</div></section>';
  }

  async function confirmarRevisao() {
    if (busy || !revisaoAtual || !escolha) return;
    busy = true;
    const botao = corpoDialogo.querySelector('[data-review-confirm]');
    if (botao) { botao.disabled = true; botao.textContent = 'Salvando…'; }
    try {
      const resposta = await pedir('POST', null, {
        action: 'revisar',
        questao_id: revisaoAtual.questaoId,
        choice: escolha,
        operation: uuid()
      });
      if (resposta.item) {
        const indice = dados.itens.findIndex((i) => i.questaoId === resposta.item.questaoId);
        if (indice >= 0) dados.itens[indice] = resposta.item;
        else dados.itens.push(resposta.item);
      }
      if (resposta.indicadores) dados.indicadores = resposta.indicadores;
      renderResumo();
      renderLista();
      renderResultado(resposta);
    } catch (e) {
      erroRevisao(e.message);
      if (botao) { botao.disabled = false; botao.textContent = 'Confirmar resposta'; }
    } finally {
      busy = false;
    }
  }

  /* ------------------------------------------------------------ eventos */
  lista.addEventListener('click', (e) => {
    const filtrar = e.target.closest('[data-filter]');
    if (filtrar) {
      filtro = filtrar.getAttribute('data-filter');
      renderLista();
      return;
    }
    const revisar = e.target.closest('[data-review]');
    if (revisar) abrirRevisao(revisar.getAttribute('data-review'));
  });

  corpoDialogo.addEventListener('change', (e) => {
    const input = e.target.closest('input[name="cd-choice"]');
    if (!input) return;
    escolha = input.value;
    const selecao = corpoDialogo.querySelector('[data-selection]');
    if (selecao) selecao.textContent = 'Selecionada: ' + escolha;
    const confirmar = corpoDialogo.querySelector('[data-review-confirm]');
    if (confirmar) confirmar.disabled = false;
  });

  corpoDialogo.addEventListener('click', (e) => {
    if (e.target.closest('[data-review-confirm]')) { confirmarRevisao(); return; }
    const deNovo = e.target.closest('[data-review-again]');
    if (deNovo) abrirRevisao(deNovo.getAttribute('data-review-again'));
  });

  if (dialogo) {
    dialogo.addEventListener('click', (e) => {
      if (e.target === dialogo) fecharDialogo();
      if (e.target.closest('[data-close]')) fecharDialogo();
    });
  }

  /* ------------------------------------------------------------ início */
  async function carregar() {
    caixaErro.hidden = true;
    try {
      const r = await pedir('GET', null, null);
      dados = {
        itens: Array.isArray(r.itens) ? r.itens : [],
        indicadores: r.indicadores || {},
        estados: Array.isArray(r.estados) ? r.estados : [],
        dominioAcertos: Number(r.dominioAcertos) || 2
      };
      renderResumo();
      renderLista();
      const questao = new URLSearchParams(location.search).get('questao');
      if (questao) abrirRevisao(questao);
    } catch (e) {
      caixaErro.hidden = false;
      caixaErro.innerHTML = '<p>' + esc(e.message) + '</p>' +
        '<div class="aq-actions"><button type="button" class="aq-btn primary compact" data-retry>Tentar novamente</button>' +
        (e.status === 401 ? '<a class="aq-btn ghost compact" href="index.html">Entrar novamente</a>' : '') + '</div>';
      lista.setAttribute('aria-busy', 'false');
      lista.innerHTML = '<div class="cd-vazio">Não foi possível carregar o caderno agora.</div>';
    }
  }

  caixaErro.addEventListener('click', (e) => {
    if (e.target.closest('[data-retry]')) carregar();
  });

  carregar();
})();
