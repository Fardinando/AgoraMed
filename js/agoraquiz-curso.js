'use strict';

(() => {
  const cursoId = new URLSearchParams(location.search).get('curso_id') || '';
  const raiz = document.querySelector('#atividade');
  const aviso = document.querySelector('#aviso');
  const topoHistorico = document.querySelector('#historico-topo');
  const etiquetas = document.querySelector('#quiz-tags');
  if (cursoId) {
    const cursoUrl = 'curso.html?id=' + encodeURIComponent(cursoId);
    document.querySelector('#voltar-curso').href = cursoUrl;
    document.querySelector('#curso-caminho').href = cursoUrl;
  }

  const letras = ['A', 'B', 'C', 'D'];
  const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => entidades[c]);
  const prosa = texto => esc(texto).split(/\n\s*\n/).map(paragrafo =>
    '<p>' + paragrafo.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>') + '</p>'
  ).join('');
  const botao = (acao, rotulo, classe = 'ghost') =>
    '<button type="button" class="aq-btn ' + classe + '" data-acao="' + acao + '">' + rotulo + '</button>';
  const nomeModo = modo => modo === 'estudo' ? 'Estudo' : 'Simulado';

  let atual = null;
  let exibida = null;
  let tela = 'inicio';
  let indice = 0;
  let tamanhos = [];
  let carregando = false;
  let pendente = null;
  let historico = [];
  let alterada = false;
  let temMais = false;
  const eventosEnviados = new Set();
  const eventosEmEnvio = new Set();
  const idsEvento = new Map();
  const inicioQuestao = new Map();

  async function pedir(query, corpo) {
    const parametros = new URLSearchParams({ curso_id: cursoId, ...query });
    const resposta = await fetch('/api/agoraquiz-curso?' + parametros, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...(corpo ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curso_id: cursoId, ...corpo })
      } : {})
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw Object.assign(new Error(dados.erro || 'Não foi possível abrir o AgoraQuiz.'), { status: resposta.status });
    return dados;
  }

  async function registrarEvento(tipo, questaoId, tentativaId, tempoMs = null) {
    const chave = [tentativaId, questaoId, tipo].join(':');
    if (!tentativaId || eventosEnviados.has(chave) || eventosEmEnvio.has(chave)) return;
    if (!idsEvento.has(chave)) idsEvento.set(chave, crypto.randomUUID());
    eventosEmEnvio.add(chave);
    try {
      await pedir({}, { acao: 'evento', evento: { id: idsEvento.get(chave), tipo,
        questao_id: questaoId, tentativa_id: tentativaId, tempo_resposta_ms: tempoMs } });
      eventosEnviados.add(chave);
    } catch { /* A telemetria não bloqueia a prática clínica. */ }
    finally { eventosEmEnvio.delete(chave); }
  }

  function recomendar(questao) {
    if (!questao.aulasRelacionadas.length) return '';
    const links = questao.aulasRelacionadas.map(aula => {
      const params = new URLSearchParams({ c: cursoId, m: aula.moduloId, a: aula.aulaId });
      return '<li><a href="aula.html?' + esc(params) + '">Revisar aula ' + aula.numero + '</a></li>';
    }).join('');
    return '<h4>Aulas para revisar</h4><ul>' + links + '</ul>';
  }

  function feedback(q) {
    const certo = q.escolha === q.gabarito;
    const comentarios = letras.map(letra =>
      '<dt><strong>' + letra + ' — ' + (letra === q.gabarito ? 'Correta' : 'Incorreta') + '</strong></dt><dd>' +
      prosa(q.comentarios[letra]) + '</dd>').join('');
    return '<section class="aq-feedback' + (certo ? '' : ' wrong') + '">' +
      '<h3>' + (certo ? 'Resposta correta' : 'Resposta incorreta') + '</h3>' +
      '<p>Sua resposta · ' + esc(q.escolha) + ' · Gabarito · ' + esc(q.gabarito) + '</p>' +
      '<h4>Entendendo o raciocínio clínico</h4>' + prosa(q.raciocinioClinico) +
      '<details open><summary>Analisando as alternativas</summary><dl>' + comentarios + '</dl></details>' +
      '<div class="aq-pearl"><strong>Pérola do Plantão</strong>' + prosa(q.perola) + '</div>' +
      '<details><summary>Referências</summary>' + prosa(q.referencias) + '</details>' + recomendar(q) + '</section>';
  }

  function pergunta(q, bloqueada, grupo = 'escolha') {
    return '<div class="aq-stem">' + prosa(q.enunciado) + '</div>' +
      '<fieldset class="aq-options"' + (bloqueada ? ' disabled' : '') + '><legend class="sr-only">Alternativas</legend>' +
      letras.map(letra => {
        const estado = q.gabarito === letra ? ' correct' : q.gabarito && q.escolha === letra ? ' wrong' : '';
        return '<label class="aq-option' + estado + '"><input type="radio" name="' + grupo + '" value="' + letra + '"' +
          (q.escolha === letra ? ' checked' : '') + '><span class="aq-letter">' + letra +
          '</span><span>' + esc(q.alternativas[letra]) + '</span></label>';
      }).join('') + '</fieldset>';
  }

  function inicio() {
    const retomar = atual ? botao('retomar', atual.concluidoEm ? 'Ver último resultado' : 'Retomar tentativa', 'primary') : '';
    return '<p class="quiz-intro">Defina quantas questões resolver e quando receber o feedback: a cada resposta, no modo <strong>Estudo</strong>, ou ao final, no <strong>Simulado</strong>.</p>' +
      '<form id="configuracao"><div class="quiz-campos"><label><span>Modo</span><span class="quiz-seletor"><select name="modalidade">' +
      '<option value="estudo">Estudo</option><option value="simulado">Simulado</option></select></span></label>' +
      '<label><span>Questões</span><span class="quiz-seletor"><select name="quantidade">' + tamanhos.map(n => '<option>' + n + '</option>').join('') +
      '</select></span></label></div><div class="aq-actions">' + retomar +
      '<button type="submit" class="aq-btn ' + (atual ? 'ghost' : 'primary') + '">Nova tentativa</button>' +
      '</div></form>';
  }

  function atividade() {
    const q = exibida.questoes[indice];
    const simulado = exibida.modalidade === 'simulado';
    const navegacao = simulado ? '<nav class="quiz-navegacao" aria-label="Questões">' +
      exibida.questoes.map((item, i) => '<button class="aq-btn ghost compact" type="button" data-indice="' + i +
        '"' + (i === indice ? ' aria-current="step"' : '') + ' aria-label="Questão ' + (i + 1) +
        (item.escolha ? ', respondida' : ', sem resposta') + '">' + (i + 1) + (item.escolha ? ' ✓' : '') + '</button>').join('') +
      '</nav>' : '';
    const segmentos = exibida.questoes.map((item, i) =>
      '<span class="' + (i === indice ? 'current' : item.escolha ? 'done' : '') + '"></span>').join('');
    const progresso = '<div class="aq-progress-top"><span>QUESTÃO <strong>' + (indice + 1) +
      '</strong> DE ' + exibida.total + '</span><span>' + exibida.respondidas + ' ' +
      (simulado ? 'SALVA' : 'CONFIRMADA') + (exibida.respondidas === 1 ? '' : 'S') + '</span></div>' +
      '<div class="aq-segments" aria-hidden="true">' + segmentos + '</div>';
    const titulo = q.titulo || 'Questão ' + (indice + 1);
    const controle = q.gabarito
      ? feedback(q) + '<div class="aq-actions">' + (indice + 1 < exibida.total
        ? botao('avancar', 'Próxima questão', 'primary') : botao('finalizar', 'Ver resultado', 'primary')) + '</div>'
      : '<p class="aq-selection" data-selecao role="status">' + (q.escolha
        ? 'Salva · ' + esc(q.escolha) : 'Selecione uma alternativa.') + '</p>' +
        '<div class="aq-actions"><button class="aq-btn primary" data-confirmar' + (q.escolha ? '' : ' disabled') + '>' +
        (simulado ? 'Salvar resposta' : 'Confirmar resposta') + '</button>' +
        (simulado ? botao('finalizar', 'Finalizar simulado') : '') + '</div>';
    return progresso + navegacao + '<p class="aq-eyebrow">Caso clínico · ' + nomeModo(exibida.modalidade) + '</p>' +
      '<h2 class="aq-question-title" tabindex="-1">' + esc(titulo) + '</h2>' +
      '<form id="resposta">' + pergunta(q, Boolean(q.gabarito)) + controle + '</form>';
  }

  function resultado() {
    const t = exibida;
    const revisao = t.questoes.map((q, i) => {
      const acertou = q.escolha === q.gabarito;
      return '<details data-questao="' + esc(q.id) + '"><summary><span>Questão ' + (i + 1) + ' — ' + esc(q.titulo) + '</span>' +
        '<span class="aq-tag' + (acertou ? '' : ' wrong') + '">' + (acertou
          ? 'Acertou · ' + esc(q.escolha) : 'Errou · ' + esc(q.escolha) + ' / ' + esc(q.gabarito)) + '</span></summary>' +
        '<div class="aq-review-body">' + (!acertou ? '<p>Competência para revisar · ' + esc(q.competencia) + '</p>' : '') +
        pergunta(q, true, q.id) + feedback(q) + '</div></details>';
    }).join('');
    return '<p class="aq-eyebrow">Resultado da tentativa</p><div class="aq-result-head">' +
      '<div class="aq-score-ring" aria-label="' + t.acertos + ' acertos de ' + t.total + '"><strong>' +
      t.acertos + '</strong><small>de ' + t.total + '</small></div>' +
      '<div><h2 tabindex="-1">' + (t.erros ? 'Revise suas decisões.' : 'Domínio do tema.') + '</h2><p>' +
      nomeModo(t.modalidade) + ' · ' + t.respondidas + ' respondidas · ' + t.erros +
      (t.erros === 1 ? ' erro' : ' erros') + '</p><p class="aq-aproveitamento">Aproveitamento · <strong>' +
      t.percentual + '%</strong></p></div></div><div class="aq-review">' + revisao + '</div>' +
      '<div class="aq-actions">' + botao('inicio', 'Voltar ao AgoraQuiz', 'primary') +
      '<a class="aq-btn ghost" href="caderno-erros.html">Caderno de erros</a></div>';
  }

  function mostrarHistorico() {
    const itens = historico.map(t => '<li><p>' + nomeModo(t.modalidade) + ' · ' +
      esc(new Date(t.iniciadoEm).toLocaleString('pt-BR')) + ' · ' +
      (t.concluidoEm ? t.acertos + '/' + t.total + ' acertos' : t.respondidas + '/' + t.total + ' respondidas') +
      '</p>' + (t.concluidoEm ? '<button class="aq-btn ghost compact" data-tentativa="' + esc(t.id) +
        '">Revisar resultado</button>' : '') + '</li>').join('');
    return (itens ? '<ul>' + itens + '</ul>' : '<p>Você ainda não tem tentativas.</p>') +
      '<div class="aq-actions">' + (temMais ? botao('mais', 'Carregar mais') : '') + botao('inicio', 'Voltar') + '</div>';
  }

  function render(focar = true) {
    const telas = {
      inicio: ['Escolha como praticar', inicio],
      atividade: ['', atividade],
      resultado: ['', resultado],
      historico: ['Histórico de tentativas', mostrarHistorico]
    };
    const [titulo, corpo] = telas[tela];
    alterada = false;
    const configuracao = tela === 'inicio';
    raiz.innerHTML = '<section class="aq-card' + (configuracao ? ' quiz-configuracao" aria-labelledby="quiz-configuracao-titulo">' +
      '<p class="quiz-configuracao-selo">Configuração da prática</p>' : '">') +
      (titulo ? '<h2 tabindex="-1"' + (configuracao ? ' id="quiz-configuracao-titulo"' : '') + '>' + titulo + '</h2>' : '') +
      corpo() + '</section>';
    if (tela === 'atividade' && exibida?.questoes[indice]) {
      const qid = exibida.questoes[indice].id;
      const chave = exibida.id + ':' + qid;
      if (!inicioQuestao.has(chave)) inicioQuestao.set(chave, performance.now());
      void registrarEvento('quiz_question_presented', qid, exibida.id);
    }
    const tags = exibida && (tela === 'atividade' || tela === 'resultado')
      ? [exibida.total + ' questões', nomeModo(exibida.modalidade),
        exibida.modalidade === 'estudo' ? 'Feedback imediato' : 'Correção ao finalizar', 'Progresso salvo']
      : [tamanhos.join(' ou ') + ' questões', 'Estudo e Simulado', 'Progresso salvo'];
    etiquetas.replaceChildren(...tags.map(texto => {
      const etiqueta = document.createElement('span');
      etiqueta.textContent = texto;
      return etiqueta;
    }));
    etiquetas.hidden = !tamanhos.length;
    if (focar) {
      raiz.querySelector('h2').focus({ preventScroll: true });
      const topo = document.querySelector('.aq-top').offsetHeight;
      const alvo = raiz.getBoundingClientRect().top + window.scrollY - topo - 8;
      window.scrollTo(0, alvo);
    }
  }

  function retomar(tentativa) {
    exibida = tentativa;
    tela = tentativa.concluidoEm ? 'resultado' : 'atividade';
    const primeiraPendente = tentativa.questoes.findIndex(q => !q.escolha);
    indice = primeiraPendente === -1 ? tentativa.total - 1 : primeiraPendente;
    render();
  }

  async function executar(fn) {
    if (carregando) return;
    carregando = true;
    raiz.setAttribute('aria-busy', 'true');
    aviso.textContent = '';
    try {
      await fn();
    } catch (erro) {
      aviso.textContent = erro.message;
      if (!raiz.querySelector('[data-acao="repetir"]')) {
        raiz.insertAdjacentHTML('beforeend', botao('repetir', 'Tentar novamente'));
      }
    } finally {
      raiz.setAttribute('aria-busy', 'false');
      carregando = false;
    }
  }

  async function carregar() {
    const dados = await pedir({});
    atual = dados.tentativa;
    tamanhos = dados.tamanhos;
    topoHistorico.disabled = false;
    tela = 'inicio';
    render(false);
  }

  async function salvar(dados) {
    const operacao = pendente || {
      ...dados,
      tentativa: atual?.id || null,
      revisao: atual?.revisao || 0,
      operacao: crypto.randomUUID()
    };
    pendente = operacao;
    try {
      atual = (await pedir({}, operacao)).tentativa;
    } catch (erro) {
      if (erro.status && erro.status < 500) pendente = null;
      throw erro;
    }
    pendente = null;
    exibida = atual;
    tela = atual.concluidoEm ? 'resultado' : 'atividade';
    if (operacao.acao === 'iniciar') indice = 0;
    render();
  }

  async function listar(offset = 0) {
    const dados = await pedir({ historico: '1', offset });
    historico = offset ? historico.concat(dados.tentativas) : dados.tentativas;
    temMais = dados.mais;
    tela = 'historico';
    render();
  }

  raiz.addEventListener('submit', evento => {
    evento.preventDefault();
    const dados = new FormData(evento.target);
    if (pendente) return;
    if (evento.target.id === 'configuracao') {
      if (atual && !atual.concluidoEm && !window.confirm('Iniciar uma nova tentativa? A tentativa atual permanecerá no histórico.')) return;
      executar(() => salvar({ acao: 'iniciar', modalidade: dados.get('modalidade'), quantidade: Number(dados.get('quantidade')) }));
    } else if (evento.target.id === 'resposta') {
      const escolha = dados.get('escolha');
      if (!escolha) { aviso.textContent = 'Selecione uma alternativa.'; return; }
      executar(() => { const qid = exibida.questoes[indice].id; const inicio = inicioQuestao.get(exibida.id + ':' + qid);
        return salvar({ acao: 'responder', questaoId: qid, escolha, tempo_resposta_ms: inicio ? Math.min(3600000, Math.max(0, Math.round(performance.now() - inicio))) : null }); });
    }
  });

  raiz.addEventListener('toggle', evento => {
    const detalhe = evento.target;
    if (tela !== 'resultado' || detalhe.tagName !== 'DETAILS' || !detalhe.open || !detalhe.dataset.questao) return;
    if (exibida.modalidade === 'simulado') void registrarEvento('quiz_explanation_viewed', detalhe.dataset.questao, exibida.id);
  }, true);

  raiz.addEventListener('change', evento => {
    if (evento.target.name !== 'escolha' || tela !== 'atividade') return;
    const escolha = evento.target.value;
    const salvarResposta = raiz.querySelector('[data-confirmar]');
    if (salvarResposta) salvarResposta.disabled = false;
    const selecao = raiz.querySelector('[data-selecao]');
    if (selecao) selecao.textContent = 'Selecionada · ' + escolha;
    alterada = exibida.modalidade === 'simulado' && escolha !== exibida.questoes[indice].escolha;
  });

  topoHistorico.addEventListener('click', () => {
    if (pendente) return;
    if (alterada) {
      aviso.textContent = 'Salve a resposta antes de abrir o histórico.';
      raiz.querySelector('[data-confirmar]')?.focus();
      return;
    }
    executar(() => listar());
  });

  raiz.addEventListener('click', evento => {
    const alvo = evento.target.closest('button');
    if (!alvo || carregando) return;
    const { acao, tentativa, indice: posicao } = alvo.dataset;
    if (acao === 'repetir') { executar(() => pendente ? salvar() : carregar()); return; }
    if (pendente) return;
    if (alterada && (posicao !== undefined || acao === 'finalizar')) {
      aviso.textContent = 'Salve a resposta antes de continuar.';
      return;
    }
    if (acao === 'inicio') { tela = 'inicio'; render(); }
    if (acao === 'retomar') retomar(atual);
    if (acao === 'avancar') { indice += 1; render(); }
    if (acao === 'mais') executar(() => listar(historico.length));
    if (posicao !== undefined) { indice = Number(posicao); render(); }
    if (acao === 'finalizar') executar(() => salvar({ acao: 'finalizar' }));
    if (tentativa) executar(async () => retomar((await pedir({ tentativa })).tentativa));
  });

  executar(carregar);
})();
