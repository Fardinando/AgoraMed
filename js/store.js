/* ============================================================
   AGORAMED — Store: camada de dados do navegador.
   Os dados passam pela API do site; PDFs usam autorização temporária para envio direto.
   As chaves do Supabase nunca chegam aqui: o banco é acessado
   somente pelas funções serverless no Vercel.
   ============================================================ */
const Store = (() => {
  let eu = null;                 // perfil do usuário logado
  let versaoSessao = 0;          // invalida respostas iniciadas antes do logout
  let catalogoCache = [];
  let cursosCache = [];          // cursos visíveis a quem está logado
  let progressoCache = new Set(); // aula_ids concluídas do usuário atual
  const pendentes = new Map();    // aula_id -> { ts, vai } (vai=true: marcar)
  let promosCache = [];          // divulgações ativas
  let alunosCache = [];          // professor: perfis de todos os alunos
  let matriculasCache = [];      // professor: todas as matrículas

  async function api(caminho, { metodo = 'GET', corpo, keepalive = false } = {}) {
    try {
      const r = await fetch('/api' + caminho, {
        method: metodo,
        headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
        body: corpo ? JSON.stringify(corpo) : undefined,
        credentials: 'same-origin',
        cache: 'no-store',
        keepalive,
      });
      return await r.json();
    } catch (e) {
      return { ok: false, erro: 'Falha de comunicação com o servidor. Verifique sua conexão.' };
    }
  }

  const uid = () =>
    (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());

  /* ---------------------------------------------------------- sessão */
  /* cache em sessionStorage para evitar re-buscar tudo a cada troca de página */
  const CACHE_KEY = 'agoramed_app_cache_v3';
  function lerCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (!c || !c.dados || !c.ts) return null;
      /* cache válido por 5 minutos */
      if (Date.now() - c.ts > 5 * 60 * 1000) return null;
      return c;
    } catch (e) { return null; }
  }
  function salvarCache(dados) {
    try {
      /* preserva pendentes existentes (não vêm do /api/app) */
      let p = [];
      try {
        const antigo = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (antigo && antigo.dados && Array.isArray(antigo.dados.pendentes)) p = antigo.dados.pendentes;
      } catch (e) {}
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ dados: { ...dados, pendentes: p }, ts: Date.now() }));
    } catch (e) {}
  }
  function limparCache() { try { sessionStorage.removeItem(CACHE_KEY); sessionStorage.removeItem('agoramed_app_cache'); sessionStorage.removeItem('agoramed_app_cache_v2'); } catch (e) {} }

  async function iniciar({ atualizar = false } = {}) {
    if (atualizar) limparCache();
    const versao = versaoSessao;
    /* tenta usar o cache para não esperar o backend em cada troca de página */
    const cache = lerCache();
    if (cache && cache.dados && cache.dados.usuario) {
      eu = cache.dados.usuario;
      cursosCache = cache.dados.cursos || [];
      catalogoCache = cache.dados.catalogo || [];
      progressoCache = new Set(cache.dados.progresso || []);
      /* restaura toggles pendentes de navegação anterior (expira em 30s) */
      (cache.dados.pendentes || []).forEach((p) => {
        if (p && p.id && Date.now() - (p.ts || 0) < 30000) pendentes.set(p.id, { ts: p.ts, vai: !!p.vai });
      });
      promosCache = cache.dados.promos || [];
      alunosCache = cache.dados.alunos || [];
      matriculasCache = cache.dados.matriculas || [];
      /* revalida em segundo plano apenas se o cache tiver mais de 30s */
      if (Date.now() - cache.ts > 30 * 1000) revalidar();
      return eu;
    }
    /* uma única chamada: /api/app já verifica sessão internamente */
    const r = await api('/app');
    if (versao !== versaoSessao) return null;
    if (!r || !r.ok) { eu = null; limparDados(); limparCache(); return null; }
    eu = r.usuario;
    cursosCache = r.cursos || [];
    catalogoCache = r.catalogo || [];
    progressoCache = new Set(r.progresso || []);
    promosCache = r.promos || [];
    alunosCache = r.alunos || [];
    matriculasCache = r.matriculas || [];
    salvarCache(r);
    return eu;
  }

  async function revalidar() {
    const versao = versaoSessao;
    try {
      const r = await api('/app');
      if (versao !== versaoSessao) return;
      if (!r || !r.ok) { limparCache(); eu = null; limparDados(); return; }
      eu = r.usuario;
      cursosCache = r.cursos || [];
      catalogoCache = r.catalogo || [];
      progressoCache = new Set(r.progresso || []);
      /* reaplica toggles ainda em andamento para não perder */
      limparPendentesExpirados();
      pendentes.forEach(({ vai }, id) => {
        if (vai) progressoCache.add(id); else progressoCache.delete(id);
      });
      promosCache = r.promos || [];
      alunosCache = r.alunos || [];
      matriculasCache = r.matriculas || [];
      salvarCache(r);
      gravarProgressoNoCache();
    } catch (e) {}
  }

  async function carregarDados() {
    const versao = versaoSessao;
    const r = await api('/app');
    if (versao !== versaoSessao) return;
    if (!r || !r.ok) { limparDados(); limparCache(); return; }
    cursosCache = r.cursos || [];
    catalogoCache = r.catalogo || [];
    progressoCache = new Set(r.progresso || []);
    limparPendentesExpirados();
    pendentes.forEach(({ vai }, id) => {
      if (vai) progressoCache.add(id); else progressoCache.delete(id);
    });
    promosCache = r.promos || [];
    alunosCache = r.alunos || [];
    matriculasCache = r.matriculas || [];
    salvarCache(r);
    gravarProgressoNoCache();
  }
  function limparDados() {
    cursosCache = []; catalogoCache = []; progressoCache = new Set();
    promosCache = []; alunosCache = []; matriculasCache = [];
    pendentes.clear();
    operacoesCurso.clear(); novoPendente = null;
  }

  const usuarioAtual = () => eu;
  const proteger = () => {
    if (!eu) location.href = 'index.html';
    return eu;
  };

  async function entrar(email, senha) {
    const r = await api('/auth/entrar', { metodo: 'POST', corpo: { email, senha } });
    if (!r.ok) return r;
    eu = r.usuario;
    await carregarDados();
    return { ok: true };
  }

  const cadastrar = (nome, email, senha, whats) =>
    api('/auth/cadastro', { metodo: 'POST', corpo: { nome, email, senha, whatsapp: whats } });

  async function sair() {
    const r = await api('/auth/sair', { metodo: 'POST' });
    if (!r || !r.ok) return r || { ok: false, erro: 'Não foi possível sair. Tente novamente.' };
    versaoSessao++;
    eu = null; limparDados(); limparCache();
    return { ok: true };
  }

  const esqueciSenha = (email) => api('/auth/esqueci-senha', { metodo: 'POST', corpo: { email } });
  const redefinirSenha = (access, refresh, senha) =>
    api('/auth/redefinir-senha', { metodo: 'POST', corpo: { access, refresh, senha } });

  /* ------------------------------------------------------------ cursos */
  const cursos = () => cursosCache;
  const catalogo = () => catalogoCache;
  const cursosDoUsuario = () => cursosCache; // o servidor já devolve só o que o aluno tem acesso
  const acharCurso = (id) => cursosCache.find((c) => c.id === id);

  const operacoesCurso = new Map();
  let novoPendente = null;
  async function carregarCursoEdicao(id) {
    const r = await api('/admin/cursos?id=' + encodeURIComponent(id));
    if (!r.ok) return r;
    const i = cursosCache.findIndex(c => c.id === id);
    if (i >= 0) cursosCache[i] = r.curso; else cursosCache.push(r.curso);
    limparCache();
    return r;
  }
  async function enviarCurso(ed, removidos, metodo) {
    const chave = metodo + ':' + ed.id;
    const assinatura = JSON.stringify({ curso: ed, removidos });
    let op = operacoesCurso.get(chave);
    if (!op || op.assinatura !== assinatura) {
      op = { assinatura, operacaoId: uid() };
      operacoesCurso.set(chave, op);
    }
    const corpo = { curso: ed, removidos, operacaoId: op.operacaoId };
    if (new TextEncoder().encode(JSON.stringify(corpo)).byteLength > 4000000)
      return { ok: false, erro: 'Há muitos arquivos para um único salvamento. Envie menos PDFs por vez; suas alterações continuam no editor.' };
    const r = await api('/admin/cursos', { metodo, corpo });
    if (r.ok) operacoesCurso.delete(chave);
    return r;
  }
  async function salvarCurso(ed, removidos = { modulos: [], aulas: [], materiais: [] }) {
    const r = await enviarCurso(ed, removidos, 'POST');
    if (!r.ok) return r;
    const i = cursosCache.findIndex(c => c.id === r.curso.id);
    if (i >= 0) cursosCache[i] = r.curso; else cursosCache.push(r.curso);
    limparCache();
    return r;
  }
  async function novoCurso() {
    if (!novoPendente) novoPendente = { id: uid(), versao: 0, titulo: 'Novo curso', tipoAcesso: 'pago', urlVendas: '', modulos: [] };
    const r = await salvarCurso(novoPendente);
    if (r.ok) novoPendente = null;
    return r;
  }
  async function excluirCurso(id) {
    const curso = acharCurso(id);
    if (!curso || !Number.isInteger(curso.versao)) return { ok: false, erro: 'Atualize a lista antes de excluir.' };
    const r = await enviarCurso({ id, versao: curso.versao }, { modulos: [], aulas: [], materiais: [] }, 'DELETE');
    if (r.ok) { cursosCache = cursosCache.filter(c => c.id !== id); limparCache(); }
    return r;
  }

  /* ------------------------------------------------- estatísticas/duração */
  function parseDuracao(txt) {
    if (!txt) return 0;
    const p = String(txt).split(':').map(Number).filter((n) => !isNaN(n));
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
  }

  function estatisticasCurso(c) {
    let aulas = 0, segundos = 0, pdfs = 0;
    (c.modulos || []).forEach((m) => (m.aulas || []).forEach((a) => {
      aulas++; segundos += parseDuracao(a.duracao); pdfs += (a.pdfs || []).length;
    }));
    const h = Math.floor(segundos / 3600), min = Math.round((segundos % 3600) / 60);
    const duracao = segundos === 0 ? 'em atualização' : (h > 0 ? `${h}h${String(min).padStart(2, '0')}` : `${min} min`);
    return { aulas, duracao, pdfs, modulos: (c.modulos || []).length };
  }

  /* ---------------------------------------------------------- progresso */
  const estaConcluida = (userId, aulaId) => progressoCache.has(aulaId);

  async function alternarConcluida(userId, aulaId) {
    const vai = !progressoCache.has(aulaId);
    /* otimista: atualiza visual imediatamente */
    if (vai) progressoCache.add(aulaId); else progressoCache.delete(aulaId);
    pendentes.set(aulaId, { ts: Date.now(), vai });
    gravarProgressoNoCache();
    const r = await api('/progresso', { metodo: 'POST', corpo: { aula_id: aulaId, acao: vai ? 'marcar' : 'desmarcar' }, keepalive: true });
    pendentes.delete(aulaId);
    if (!r.ok) {
      /* desfaz otimismo local em caso de erro */
      if (vai) progressoCache.delete(aulaId); else progressoCache.add(aulaId);
      gravarProgressoNoCache();
    } else if (typeof r.concluida === 'boolean') {
      /* sincroniza com o estado real do banco */
      if (r.concluida) progressoCache.add(aulaId); else progressoCache.delete(aulaId);
      gravarProgressoNoCache();
    }
    return r;
  }

  /* sincroniza o progressoCache de volta ao sessionStorage */
  function gravarProgressoNoCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const c = JSON.parse(raw);
      if (!c || !c.dados) return;
      c.dados.progresso = Array.from(progressoCache);
      c.dados.pendentes = Array.from(pendentes, ([id, v]) => ({ id, ts: v.ts, vai: v.vai }));
      c.ts = Date.now(); // renova validade para evitar revalidação imediata
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch (e) {}
  }

  function limparPendentesExpirados() {
    const agora = Date.now();
    pendentes.forEach((v, id) => { if (agora - (v.ts || 0) > 30000) pendentes.delete(id); });
  }

  function progressoCurso(userId, curso) {
    let total = 0, feitas = 0;
    (curso.modulos || []).forEach((m) => (m.aulas || []).forEach((a) => { total++; if (estaConcluida(userId, a.id)) feitas++; }));
    return { total, feitas, percentual: total ? Math.round(feitas / total * 100) : 0 };
  }

  /* --------------------------------------------------------- comentários */
  /* contexto no formato 'aula:<curso>:<modulo>:<aula>' — a aula é o último trecho */
  const aulaDoContexto = (contexto) => String(contexto || '').split(':').pop();

  async function comentariosDe(contexto) {
    const r = await api('/comentarios?aula=' + encodeURIComponent(aulaDoContexto(contexto)));
    return (r && r.comentarios) || [];
  }

  async function comentar(contexto, usuario, texto) {
    const r = await api('/comentarios', {
      metodo: 'POST',
      corpo: { aula_id: aulaDoContexto(contexto), texto },
    });
    return r && r.ok ? r.comentario : null;
  }

  const excluirComentario = (id) => api('/comentarios?id=' + encodeURIComponent(id), { metodo: 'DELETE' });

  /* ------------------------------------------------------------- promos */
  const promos = () => promosCache;
  async function salvarPromos(lista) {
    const r = await api('/admin/promos', { metodo: 'POST', corpo: { lista } });
    if (r && r.ok) { promosCache = lista; limparCache(); }
    return r;
  }

  /* ------------------------------------------------------- alunos (professor) */
  const usuarios = () => alunosCache;
  const matriculas = () => matriculasCache;
  /* matrículas do aluno em memória (o servidor já devolve a lista completa) */
  const cursosDoAluno = (usuarioId) =>
    matriculasCache.filter((m) => m.usuario_id === usuarioId).map((m) => m.curso_id);
  const cursosAcessiveisDoAluno = (usuarioId) => {
    const aluno = alunosCache.find(u => u.id === usuarioId);
    if (!aluno || !aluno.liberado) return [];
    const pagos = new Set(cursosDoAluno(usuarioId));
    return cursosCache.filter(c => aluno.papel === 'admin' || c.tipoAcesso === 'gratis' || pagos.has(c.id)).map(c => c.id);
  };

  const progressoAluno = (usuarioId) => api('/admin/progresso?usuario_id=' + encodeURIComponent(usuarioId));

  const statusAvisos = () => api('/admin/notificacoes');
  const testarAvisos = (acao) => api('/admin/notificacoes', { metodo: 'POST', corpo: { acao } });

  async function gerenciarAluno(usuarioId, acao, cursosIds, opcoes = {}) {
    const r = await api('/admin/alunos', {
      metodo: 'POST',
      corpo: {
        usuario_id: usuarioId, acao,
        ...(acao === 'cursos' ? { cursos: cursosIds, liberar: !!(opcoes && opcoes.liberar) } : {}),
      },
    });
    if (!r || !r.ok) return r;
    limparCache();
    if (acao === 'liberar' || acao === 'bloquear') {
      const u = alunosCache.find((x) => x.id === usuarioId);
      if (u) u.liberado = acao === 'liberar';
    }
    if (acao === 'promover' || acao === 'rebaixar') {
      const u = alunosCache.find((x) => x.id === usuarioId);
      if (u) { u.papel = acao === 'promover' ? 'admin' : 'aluno'; if (acao === 'promover') u.liberado = true; }
    }
    if (acao === 'cursos') {
      matriculasCache = matriculasCache.filter((m) => m.usuario_id !== usuarioId);
      (cursosIds || []).forEach((cid) => matriculasCache.push({ usuario_id: usuarioId, curso_id: cid }));
      if (opcoes && opcoes.liberar) {
        const u = alunosCache.find((x) => x.id === usuarioId);
        if (u && u.papel !== 'admin') u.liberado = true;
      }
    }
    if (acao === 'remover') {
      alunosCache = alunosCache.filter((x) => x.id !== usuarioId);
      matriculasCache = matriculasCache.filter((m) => m.usuario_id !== usuarioId);
    }
    return r;
  }

  /* -------------------------------------------------------- imagens/PDFs */
  /** Comprime uma imagem para dataURL (JPEG). */
  function comprimirImagem(file, larguraMax = 800) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
        img.onload = () => {
          const escala = Math.min(1, larguraMax / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(file);
    });
  }

  /** Envia o PDF diretamente ao armazenamento privado; o curso recebe apenas o comprovante. */
  async function lerPDF(file, { cursoId, aulaId, progresso = () => {} } = {}) {
    if (!file || !Number.isInteger(file.size) || file.size < 5 || file.size > 50000000)
      throw new Error('Selecione um PDF de até 50 MB.');
    if (!/\.pdf$/i.test(file.name) || new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-')
      throw new Error('Selecione um arquivo PDF válido.');
    progresso(0);
    const r = await api('/admin/materiais', { metodo: 'POST', corpo: { cursoId, aulaId, nome: file.name, tamanho: file.size } });
    if (!r.ok) throw new Error(r.erro || 'Não foi possível preparar o envio do PDF.');
    await new Promise((resolve, reject) => {
      const envio = new XMLHttpRequest();
      envio.open('PUT', r.url);
      envio.timeout = 10 * 60 * 1000;
      envio.setRequestHeader('Content-Type', 'application/pdf');
      envio.setRequestHeader('x-upsert', 'false');
      envio.upload.onprogress = e => { if (e.lengthComputable) progresso(Math.min(99, Math.round(100 * e.loaded / e.total))); };
      envio.onerror = () => reject(new Error('O envio do PDF foi interrompido. Verifique sua conexão e selecione o arquivo novamente.'));
      envio.ontimeout = () => reject(new Error('O envio do PDF demorou demais. Selecione o arquivo novamente para tentar de novo.'));
      envio.onload = () => {
        if (envio.status >= 200 && envio.status < 300) { progresso(100); resolve(); }
        else reject(new Error(envio.status === 413 ? 'O armazenamento recusou o tamanho do PDF. O curso foi preservado.' : 'Não foi possível enviar o PDF. Selecione o arquivo novamente para tentar de novo.'));
      };
      envio.send(file);
    });
    return { id: null, nome: file.name, envio: r.envio };
  }

  return {
    uid,
    usuarioAtual, iniciar, entrar, cadastrar, sair, proteger,
    esqueciSenha, redefinirSenha,
    usuarios, matriculas, cursosDoAluno, cursosAcessiveisDoAluno, gerenciarAluno, progressoAluno, statusAvisos, testarAvisos,
    cursos, catalogo, cursosDoUsuario, acharCurso, carregarCursoEdicao, salvarCurso, novoCurso, excluirCurso,
    estatisticasCurso, parseDuracao,
    estaConcluida, alternarConcluida, progressoCurso,
    comentariosDe, comentar, excluirComentario,
    promos, salvarPromos,
    comprimirImagem, lerPDF,
  };
})();

/* Ao voltar pelo histórico, verifica novamente a sessão antes de exibir a página. */
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});

/* ------------------------------------------------------------- PWA / SW */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* -------------------------------------------------------------- helpers */
const UI = {
  async sair(evento) {
    const botao = evento.currentTarget;
    if (botao.disabled || !confirm('Deseja sair da plataforma?')) return;
    botao.disabled = true;
    try {
      const r = await Store.sair();
      if (!r.ok) {
        alert(r.erro || 'Não foi possível sair. Tente novamente.');
        return;
      }
      location.replace('index.html');
    } finally {
      botao.disabled = false;
    }
  },
  escapar(t = '') {
    return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  iniciais(nome = '') {
    return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('') || '?';
  },
  /* formata WhatsApp salvo como dígitos: (11) 98765-4321 */
  whatsBR(d = '') {
    const s = String(d).replace(/\D/g, '');
    if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
    if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
    return String(d || '');
  },
  dataCurta(ts) {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dataHora(ts) {
    const d = new Date(ts), hoje = new Date();
    const mesmoDia = d.toDateString() === hoje.toDateString();
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return mesmoDia ? `hoje às ${hora}` : `${d.toLocaleDateString('pt-BR')} às ${hora}`;
  },
  /* prompt de instalação do PWA — Android, iOS e desktop */
  capturarInstalacao() {
    const botao = document.getElementById('btn-instalar');
    if (!botao) return;
    /* já instalado? não oferece de novo */
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;

    const ua = navigator.userAgent;
    /* iOS/iPadOS: beforeinstallprompt nunca dispara → guia manual do Safari */
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    /* Android: botão sempre visível — prompt nativo quando existe, guia manual quando não */
    const android = /Android/i.test(ua);

    let evento = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); evento = e;
      botao.classList.remove('oculto');
    });
    window.addEventListener('appinstalled', () => botao.classList.add('oculto'));

    if (ios || android) botao.classList.remove('oculto');

    botao.addEventListener('click', async () => {
      if (evento) {
        evento.prompt();
        await evento.userChoice;
        evento = null; botao.classList.add('oculto');
        return;
      }
      /* sem prompt nativo: guia manual de cada plataforma */
      alert(ios
        ? 'Instalar no iPhone ou iPad:\n\n1. Toque no botão Compartilhar (quadrado com uma seta) na barra do Safari\n2. Toque em “Adicionar à Tela de Início”\n3. Toque em “Adicionar” no canto superior direito'
        : 'Para instalar o AGORAMED no Android:\n\nNo Chrome, toque no menu ⋮ (três pontos) e escolha “Instalar aplicativo”.\n\nEm outros navegadores: menu → “Adicionar à tela inicial”.');
    });
  },
  /* navegação inferior mobile */
  navInferior(atual) {
    const u = Store.usuarioAtual();
    if (!u) return;
    const admin = u.papel === 'admin' ? `<a href="admin.html" class="${atual === 'admin' ? 'ativo' : ''}"><span class="ico">⚙️</span>Admin</a>` : '';
    const el = document.createElement('nav');
    el.className = 'nav-inferior';
    el.innerHTML = `<div class="container">
      <a href="app.html" class="${atual === 'inicio' ? 'ativo' : ''}"><span class="ico">🏠</span>Início</a>
      <a href="app.html#cursos"><span class="ico">🎓</span>Cursos</a>
      ${admin}
      <button type="button" id="nav-sair"><span class="ico">↩️</span>Sair</button>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#nav-sair').addEventListener('click', UI.sair);
  },
};
