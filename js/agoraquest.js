/* AgoraQuest — interface da prática. O gabarito e a correção vivem no servidor. */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const aulaId = params.get('aula_id') || '';
  const raiz = document.getElementById('aq-activity');
  const caixaErro = document.getElementById('network-error');
  const status = document.getElementById('save-status');
  const TOTAL_FALLBACK = 5;
  const CURSO_HIPERCALEMIA = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';

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

  let conteudo = null;
  let estado = null;
  let revisao = 0;
  let meta = {};
  let escolha = null;
  let busy = false;
  let pending = null;
  let histItens = [];
  let histOffset = 0;

  function acertos(s) {
    if (!s) return 0;
    if (Number.isInteger(s.score)) return s.score;
    return (Array.isArray(s.answers) ? s.answers : []).filter((a) => a && a.correct).length;
  }
  function totalQuestoes() {
    return conteudo && Array.isArray(conteudo.questions) ? conteudo.questions.length : TOTAL_FALLBACK;
  }
  function indice(s) {
    if (!s || !Array.isArray(s.answers) || !s.answers.length) return 0;
    const ultima = s.answers[s.answers.length - 1];
    return ultima && ultima.seen ? s.answers.length : s.answers.length - 1;
  }
  function vistas(s) {
    return Array.isArray(s && s.answers) ? s.answers.length : 0;
  }

  async function pedir(metodo, query, corpo) {
    const url = '/api/agoraquest' + (metodo === 'GET' ? '?' + query.toString() : '');
    const opcoes = { method: metodo, credentials: 'same-origin', cache: 'no-store' };
    if (corpo) {
      opcoes.headers = { 'Content-Type': 'application/json' };
      opcoes.body = JSON.stringify(corpo);
    }
    const res = await fetch(url, opcoes);
    let dados = null;
    try { dados = await res.json(); } catch { /* resposta sem JSON */ }
    if (!res.ok || !dados || !dados.ok) {
      const erro = new Error((dados && dados.erro) || 'Não foi possível concluir a operação.');
      erro.status = res.status;
      erro.conflito = !!(dados && dados.conflito);
      throw erro;
    }
    return dados;
  }
  function get(extra) {
    return pedir('GET', new URLSearchParams(Object.assign({ aula_id: aulaId }, extra || {})));
  }
  function post(corpo) {
    return pedir('POST', null, Object.assign({ aula_id: aulaId }, corpo));
  }

  /* O tema do curso é aplicado somente ao AgoraQuest de Hipercalemia; a
     identidade global e os demais cursos permanecem no tema claro. */
  function aplicarTema() {
    const titulo = String(meta.cursoTitulo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const hiper = meta.cursoId === CURSO_HIPERCALEMIA || /hiper[ck]alemia/.test(titulo);
    if (hiper) document.body.dataset.aqTema = 'hipercalemia';
    else delete document.body.dataset.aqTema;
    const cor = document.querySelector('meta[name="theme-color"]');
    if (cor) cor.setAttribute('content', hiper ? '#061F27' : '#346F77');
  }

  function aplicar(dados, acao) {
    conteudo = dados.content || null;
    estado = dados.state || null;
    revisao = Number(dados.revision) || 0;
    meta = Object.assign({}, meta, dados);
    aplicarTema();

    const cursoUrl = meta.cursoId ? 'curso.html?id=' + encodeURIComponent(meta.cursoId) : 'app.html';
    const aulaUrl = (meta.cursoId && meta.moduloId && aulaId)
      ? `aula.html?c=${encodeURIComponent(meta.cursoId)}&m=${encodeURIComponent(meta.moduloId)}&a=${encodeURIComponent(aulaId)}`
      : 'app.html';
    const voltarAula = document.getElementById('back-lesson');
    if (voltarAula) voltarAula.href = aulaUrl;
    const crumbCurso = document.getElementById('crumb-course');
    if (crumbCurso) {
      crumbCurso.href = cursoUrl;
      crumbCurso.textContent = meta.cursoTitulo || 'Curso';
    }

    if (conteudo) {
      const subtitulo = document.getElementById('aq-subtitle');
      if (subtitulo) {
        const partes = [meta.aulaTitulo, conteudo.subtitle].filter(Boolean);
        if (partes.length) subtitulo.textContent = partes.join(' · ');
      }
    }
    document.title = 'AgoraQuest — ' + (meta.aulaTitulo || (conteudo && conteudo.title) || 'AgoraMed');
    render(acao);
  }

  function mostrarErro(erro, inicial) {
    const conflito = !!erro.conflito || erro.status === 409;
    const semSessao = erro.status === 401;
    if (inicial) {
      raiz.innerHTML = '<section class="aq-card"><h2>Não foi possível abrir a prática</h2>' +
        '<p class="aq-muted">Confira sua conexão e tente novamente.</p></section>';
    }
    caixaErro.hidden = false;
    caixaErro.innerHTML = '<p>' + esc(conflito
      ? 'A atividade mudou em outra sessão. Atualize para continuar de onde parou.'
      : (erro.message || 'Não foi possível carregar ou salvar a atividade.')) + '</p>' +
      '<div class="aq-actions">' +
      '<button type="button" class="aq-btn primary compact" data-retry>' +
      (conflito ? 'Atualizar atividade' : 'Tentar novamente') + '</button>' +
      (semSessao ? '<a class="aq-btn ghost compact" href="index.html">Entrar novamente</a>' : '') +
      '</div>';
  }

  async function carregar() {
    if (!aulaId) {
      mostrarErro(new Error('Abra esta prática a partir da aula correspondente.'), true);
      return;
    }
    caixaErro.hidden = true;
    raiz.innerHTML = '<section class="aq-card"><h2>Carregando AgoraQuest…</h2>' +
      '<p class="aq-muted">Conferindo seu acesso e suas respostas salvas.</p></section>';
    try {
      aplicar(await get({}), 'load');
    } catch (e) {
      mostrarErro(e, true);
    }
  }

  function enviar(acao, extra) {
    const corpo = Object.assign({
      action: acao,
      operation: uuid(),
      attempt: estado ? estado.id : null,
      revision: revisao
    }, extra || {});
    if (acao === 'start') corpo.previous = estado ? estado.id : null;
    return enviarCorpo(corpo);
  }

  async function enviarCorpo(corpo) {
    if (busy) return;
    busy = true;
    caixaErro.hidden = true;
    status.textContent = 'Salvando…';
    try {
      const dados = await post(corpo);
      pending = null;
      aplicar(dados, corpo.action);
      status.textContent = 'Salvo.';
    } catch (e) {
      if (e.conflito || e.status === 409 || e.status === 400 || e.status === 401) pending = null;
      else pending = corpo;
      mostrarErro(e, false);
      status.textContent = '';
    } finally {
      busy = false;
    }
  }

  async function tentarNovamente() {
    if (busy) return;
    if (pending) {
      const corpo = pending;
      pending = null;
      await enviarCorpo(corpo);
      return;
    }
    await carregar();
  }

  function focar(acao) {
    if (acao === 'load') return;
    requestAnimationFrame(() => {
      const alvo = raiz.querySelector(acao === 'answer' ? '.aq-feedback h3' : '.aq-question-title, .aq-result-head h2');
      if (!alvo) return;
      alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });
    });
  }

  function render(acao) {
    if (!conteudo) {
      raiz.innerHTML = '<section class="aq-card"><h2>Prática indisponível</h2>' +
        '<p class="aq-muted">Não foi possível carregar o conteúdo desta atividade.</p></section>';
      return;
    }
    if (!estado) {
      renderIntro();
      return;
    }
    if (estado.finishedAt) {
      renderResultado(acao);
      focar(acao);
      return;
    }
    const i = indice(estado);
    if (i >= totalQuestoes()) {
      renderResultado(acao);
      focar(acao);
      return;
    }
    renderQuestao(i);
    focar(acao);
  }

  function renderIntro() {
    escolha = null;
    raiz.innerHTML = '<section class="aq-card aq-intro">' +
      '<p class="aq-eyebrow">PRÁTICA DELIBERADA</p>' +
      '<h2>' + esc(conteudo.title) + '</h2>' +
      '<p class="aq-lead">' + esc(conteudo.subtitle) + '</p>' +
      prose(conteudo.intro) +
      '<div class="aq-note"><p><strong>Como funciona:</strong> uma questão por vez, quatro alternativas e seleção única. Ao confirmar, a alternativa fica bloqueada e o comentário aparece imediatamente. A aprovação exige 80% de acertos (4 de 5). Você pode refazer a prática quantas vezes quiser.</p></div>' +
      '<div class="aq-actions">' +
      '<button type="button" class="aq-btn primary" data-start>Começar prática →</button>' +
      '<button type="button" class="aq-btn ghost" data-history>Histórico</button>' +
      '<button type="button" class="aq-btn ghost" data-notebook>Caderno de erros</button>' +
      '</div></section>';
  }

  function renderQuestao(i) {
    const total = totalQuestoes();
    const q = conteudo.questions[i];
    const a = estado.answers[i];
    const respondida = !!(a && !a.seen);
    escolha = null;

    const segmentos = conteudo.questions.map((_, j) => {
      const r = estado.answers[j];
      const feito = !!(r && r.seen);
      const atual = j === i && !feito;
      return '<span class="' + (feito ? 'done' : atual ? 'current' : '') + '"></span>';
    }).join('');

    const opcoes = '<fieldset class="aq-options"' + (respondida ? ' disabled' : '') + ' aria-label="Alternativas">' +
      '<legend class="sr-only">Escolha uma alternativa</legend>' +
      ['A', 'B', 'C', 'D'].map((letra) => {
        const marcada = respondida && a.choice === letra;
        const correta = respondida && q.correctChoice === letra;
        const errada = respondida && marcada && !correta;
        return '<label class="aq-option' + (correta ? ' correct' : '') + (errada ? ' wrong' : '') + '">' +
          '<input type="radio" name="aq-choice" value="' + letra + '"' +
          (marcada ? ' checked' : '') + (respondida ? ' disabled' : '') + '>' +
          '<span class="aq-letter">' + letra + '</span>' +
          '<span>' + esc(q.choices[letra]) + '</span></label>';
      }).join('') + '</fieldset>';

    let corpo;
    if (respondida) {
      const ok = a.choice === q.correctChoice;
      const analise = ['A', 'B', 'C', 'D'].map((letra) => {
        const correta = letra === q.correctChoice;
        const escolhida = letra === a.choice;
        const rotulo = correta ? 'Correta' : escolhida ? 'Sua escolha' : 'Alternativa ' + letra;
        return '<div class="aq-alt' + (correta ? ' correct' : '') + (escolhida && !correta ? ' chosen' : '') + '">' +
          '<div class="aq-alt-head"><span class="aq-letter">' + letra + '</span><span>' + rotulo + '</span></div>' +
          '<p>' + esc(q.feedback[letra]) + '</p></div>';
      }).join('');
      corpo = '<section class="aq-feedback' + (ok ? '' : ' wrong') + '" aria-live="polite">' +
        '<p class="aq-answer">SUA RESPOSTA: ' + a.choice + ' · ' + (ok ? 'CORRETA' : 'INCORRETA') + '</p>' +
        '<h3>' + (ok ? 'Resposta correta.' : 'Vale revisar este ponto.') + '</h3>' +
        '<div class="aq-explanation">' + prose(q.correctExplanation) + '</div>' +
        '<details class="aq-analysis" open><summary>Análise das quatro alternativas</summary>' + analise + '</details>' +
        '<div class="aq-pearl"><strong>PÉROLA DO PLANTÃO</strong><p>' + esc(q.pearl) + '</p></div>' +
        '<p class="aq-ref"><strong>Referência:</strong> ' + refs(q.reference || conteudo.references) + '</p>' +
        '<div class="aq-actions">' +
        '<button type="button" class="aq-btn primary" data-next>' +
        (i === total - 1 ? 'Ver resultado' : 'Próxima questão') + ' →</button>' +
        '<button type="button" class="aq-btn ghost" data-notebook>Caderno de erros</button>' +
        '</div></section>';
    } else {
      corpo = '<p class="aq-selection" data-selection>Selecione uma alternativa para confirmar.</p>' +
        '<div class="aq-actions">' +
        '<button type="button" class="aq-btn primary" data-confirm disabled>Confirmar resposta</button>' +
        '<button type="button" class="aq-btn ghost" data-history>Histórico</button>' +
        '</div>';
    }

    raiz.innerHTML = '<section class="aq-card">' +
      '<div class="aq-progress-top"><span>QUESTÃO <strong>' + (i + 1) + '</strong> DE ' + total + '</span>' +
      '<span>' + vistas(estado) + ' CONFIRMADA' + (vistas(estado) === 1 ? '' : 'S') + '</span></div>' +
      '<div class="aq-segments" role="progressbar" aria-label="Progresso da prática" aria-valuemin="1" aria-valuemax="' + total + '" aria-valuenow="' + (i + 1) + '">' + segmentos + '</div>' +
      '<p class="aq-eyebrow">' + esc(q.competency || 'CASO CLÍNICO') + '</p>' +
      '<h2 class="aq-question-title">' + esc(q.title) + '</h2>' +
      '<div class="aq-stem">' + enunciado(q) + '</div>' +
      opcoes + corpo +
      '</section>';
  }

  function renderResultado(acao) {
    const total = totalQuestoes();
    const nota = acertos(estado);
    const pct = total ? Math.round(nota / total * 100) : 0;
    const aprovado = pct >= 80;
    const mensagem = pct === 100
      ? { titulo: 'Domínio do tema.', texto: 'Você reconheceu os sinais de gravidade e a prioridade de tratamento em todos os casos.' }
      : pct >= 80
        ? { titulo: 'Muito bom.', texto: 'A maior parte das decisões está consolidada. Revise o ponto que ainda pede atenção antes de refazer.' }
        : pct >= 60
          ? { titulo: 'Atenção aos detalhes.', texto: 'O raciocínio principal aparece, mas alguns critérios de gravidade ainda precisam ser fixados.' }
          : { titulo: 'Vale retomar o raciocínio.', texto: 'A hipercalemia exige leitura do contexto, não apenas do número. Use o caderno de erros e refaça a prática.' };

    const revisao = conteudo.questions.map((q, i) => {
      const a = estado.answers[i] || {};
      const ok = a.choice === q.correctChoice;
      return '<details' + (ok ? '' : ' open') + '>' +
        '<summary><span>Questão ' + (i + 1) + ' — ' + esc(q.title) + '</span>' +
        '<span class="aq-tag' + (ok ? '' : ' wrong') + '">' + (ok ? 'Acertou' : 'Errou') +
        ' · ' + esc(a.choice || '—') + (ok ? '' : ' / ' + esc(q.correctChoice)) + '</span></summary>' +
        '<div class="aq-review-body">' +
        '<p><strong>Sua resposta:</strong> ' + esc(a.choice || '—') + ' · <strong>Correta:</strong> ' + esc(q.correctChoice) + '</p>' +
        '<div class="aq-explanation">' + prose(q.correctExplanation) + '</div>' +
        '<div class="aq-pearl"><strong>PÉROLA DO PLANTÃO</strong><p>' + esc(q.pearl) + '</p></div>' +
        '</div></details>';
    }).join('');

    const cursoUrl = meta.cursoId ? 'curso.html?id=' + encodeURIComponent(meta.cursoId) : 'app.html';
    raiz.innerHTML = '<section class="aq-card">' +
      '<p class="aq-eyebrow">RESULTADO DA TENTATIVA</p>' +
      '<div class="aq-result-head">' +
      '<div class="aq-score-ring" aria-label="' + nota + ' acertos de ' + total + '"><strong>' + nota + '</strong><small>de ' + total + '</small></div>' +
      '<div><h2>' + mensagem.titulo + '</h2><p>' + mensagem.texto + '</p>' +
      '<p class="aq-approval ' + (aprovado ? 'ok' : 'warn') + '">Aproveitamento: <strong>' + pct + '%</strong> · ' +
      (aprovado ? 'Aprovado (mínimo 80%).' : 'Ainda não aprovado (mínimo 80%).') + '</p></div>' +
      '</div>' +
      '<div class="aq-review">' + revisao + '</div>' +
      (conteudo.closing ? '<div class="aq-closing"><h3>O que levar para o plantão</h3>' + prose(conteudo.closing) + '</div>' : '') +
      '<p class="aq-ref"><strong>Referência:</strong> ' + refs(conteudo.references) + '</p>' +
      '<div class="aq-actions">' +
      '<button type="button" class="aq-btn primary" data-restart>Refazer a prática</button>' +
      (meta.nextUrl ? '<a class="aq-btn ghost" href="' + esc(meta.nextUrl) + '">Próxima aula →</a>' : '') +
      '<a class="aq-btn ghost" href="' + esc(cursoUrl) + '">Voltar ao curso</a>' +
      '<button type="button" class="aq-btn ghost" data-notebook>Caderno de erros</button>' +
      '<button type="button" class="aq-btn ghost" data-history>Histórico</button>' +
      '</div></section>';
    focar(acao);
  }

  function abrirDialogo(dialogo) {
    if (!dialogo) return;
    if (dialogo.open) return;
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  }
  function fecharDialogo(dialogo) {
    if (!dialogo) return;
    if (typeof dialogo.close === 'function') dialogo.close();
    else dialogo.removeAttribute('open');
  }

  function pintarHistorico(temMais) {
    const alvo = document.getElementById('history-content');
    if (!histItens.length) {
      alvo.innerHTML = '<div class="aq-empty">Nenhuma tentativa registrada ainda. Comece a prática para criar seu histórico.</div>';
      return;
    }
    const total = totalQuestoes();
    const itens = histItens.map((s) => {
      const concluida = !!(s && s.finishedAt);
      const nota = acertos(s);
      const respondidas = s && Array.isArray(s.answers) ? s.answers.length : 0;
      return '<article class="aq-history-item">' +
        '<strong>Tentativa · ' + esc(data(s && (s.finishedAt || s.startedAt)) || 'sem data') + '</strong>' +
        '<p>' + (concluida ? 'Concluída · ' + nota + '/' + total + ' acertos' : 'Em andamento · ' + respondidas + '/' + total + ' respondidas') + '</p>' +
        '</article>';
    }).join('');
    alvo.innerHTML = itens + (temMais
      ? '<div class="aq-actions"><button type="button" class="aq-btn ghost" data-history-more>Carregar mais</button></div>'
      : '');
  }

  async function carregarHistorico(anexar) {
    const alvo = document.getElementById('history-content');
    if (!anexar) {
      histItens = [];
      histOffset = 0;
      alvo.innerHTML = '<p class="aq-muted">Carregando tentativas…</p>';
    }
    try {
      const dados = await get({ historico: '1', offset: String(histOffset) });
      const novos = Array.isArray(dados.history) ? dados.history : [];
      histItens = anexar ? histItens.concat(novos) : novos;
      histOffset += novos.length;
      pintarHistorico(!!dados.more);
    } catch (e) {
      alvo.innerHTML = '<div class="aq-alert"><p>' + esc(e.message) + '</p></div>';
    }
  }

  function abrirHistorico() {
    abrirDialogo(document.getElementById('history-dialog'));
    carregarHistorico(false);
  }

  async function abrirCaderno() {
    const dialogo = document.getElementById('notebook-dialog');
    const alvo = document.getElementById('notebook-content');
    alvo.innerHTML = '<p class="aq-muted">Carregando seu caderno de erros…</p>';
    abrirDialogo(dialogo);
    try {
      const dados = await get({ caderno: '1' });
      const itens = Array.isArray(dados.caderno) ? dados.caderno : [];
      const ind = dados.indicadores || {};
      if (!itens.length) {
        alvo.innerHTML = '<div class="aq-empty">Nenhum erro registrado nesta aula até agora. As questões erradas aparecem aqui para revisão direcionada.</div>';
        return;
      }
      const stats = '<div class="aq-stats">' +
        '<div class="aq-stat"><strong>' + (ind.total || 0) + '</strong><span>QUESTÕES</span></div>' +
        '<div class="aq-stat"><strong>' + (ind.precisaRevisar || 0) + '</strong><span>PRECISAM REVISAR</span></div>' +
        '<div class="aq-stat"><strong>' + (ind.emRevisao || 0) + '</strong><span>EM REVISÃO</span></div>' +
        '<div class="aq-stat"><strong>' + (ind.dominadas || 0) + '</strong><span>DOMINADAS</span></div>' +
        '</div>';
      alvo.innerHTML = stats + itens.map((item) => '<article class="aq-notebook-item">' +
        '<div class="aq-notebook-top"><p class="aq-eyebrow">QUESTÃO ' + esc(item.numero) + '</p>' +
        '<span class="aq-state ' + esc(item.estado) + '">' + esc(item.estadoRotulo) + '</span></div>' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<p><strong>' + esc(item.erros) + '</strong> erro' + (item.erros === 1 ? '' : 's') +
        ' · <strong>' + esc(item.revisoes) + '</strong> revis' + (item.revisoes === 1 ? 'ão' : 'ões') + '</p>' +
        '<a class="aq-btn ghost compact" href="caderno-erros.html?questao=' + encodeURIComponent(item.questaoId) + '">Revisar questão →</a>' +
        '</article>').join('') +
        '<div class="aq-actions"><a class="aq-btn primary" href="caderno-erros.html">Abrir Meu Caderno de Erros</a></div>';
    } catch (e) {
      alvo.innerHTML = '<div class="aq-alert"><p>' + esc(e.message) + '</p></div>';
    }
  }

  /* ------------------------------------------------------------ eventos */
  raiz.addEventListener('change', (e) => {
    const input = e.target.closest('input[name="aq-choice"]');
    if (!input) return;
    escolha = input.value;
    const selecao = raiz.querySelector('[data-selection]');
    if (selecao) selecao.textContent = 'Selecionada: ' + escolha;
    const confirmar = raiz.querySelector('[data-confirm]');
    if (confirmar) confirmar.disabled = false;
  });

  raiz.addEventListener('click', (e) => {
    const alvo = e.target.closest('button');
    if (!alvo || !raiz.contains(alvo)) return;
    if (alvo.matches('[data-start]')) { enviar('start'); return; }
    if (alvo.matches('[data-confirm]')) {
      if (busy) return;
      if (!escolha) { status.textContent = 'Selecione uma alternativa antes de confirmar.'; return; }
      enviar('answer', { choice: escolha });
      return;
    }
    if (alvo.matches('[data-next]')) { enviar('next'); return; }
    if (alvo.matches('[data-restart]')) { abrirDialogo(document.getElementById('restart-dialog')); return; }
    if (alvo.matches('[data-history]')) { abrirHistorico(); return; }
    if (alvo.matches('[data-notebook]')) { abrirCaderno(); return; }
  });

  document.getElementById('history-content').addEventListener('click', (e) => {
    if (e.target.closest('[data-history-more]')) carregarHistorico(true);
  });

  caixaErro.addEventListener('click', (e) => {
    if (e.target.closest('[data-retry]')) tentarNovamente();
  });

  document.getElementById('history').addEventListener('click', abrirHistorico);
  document.getElementById('notebook').addEventListener('click', abrirCaderno);
  document.getElementById('restart-confirm').addEventListener('click', () => {
    fecharDialogo(document.getElementById('restart-dialog'));
    enviar('start');
  });

  document.querySelectorAll('dialog').forEach((dialogo) => {
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) fecharDialogo(dialogo); });
    dialogo.querySelectorAll('[data-close]').forEach((botao) => {
      botao.addEventListener('click', () => fecharDialogo(dialogo));
    });
  });

  carregar();
})();
