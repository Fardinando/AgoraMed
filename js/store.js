/* ============================================================
   AGORAMED — Store: camada de dados do navegador.
   Toda informação vem e vai pela API do próprio site (/api/*).
   As chaves do Supabase nunca chegam aqui: o banco é acessado
   somente pelas funções serverless no Vercel.
   ============================================================ */
const Store = (() => {
  let eu = null;                 // perfil do usuário logado
  let cursosCache = [];          // cursos visíveis a quem está logado
  let progressoCache = new Set(); // aula_ids concluídas do usuário atual
  let promosCache = [];          // divulgações ativas
  let alunosCache = [];          // professor: perfis de todos os alunos
  let matriculasCache = [];      // professor: todas as matrículas

  async function api(caminho, { metodo = 'GET', corpo } = {}) {
    try {
      const r = await fetch('/api' + caminho, {
        method: metodo,
        headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
        body: corpo ? JSON.stringify(corpo) : undefined,
        credentials: 'same-origin',
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
  const CACHE_KEY = 'agoramed_app_cache';
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
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ dados, ts: Date.now() })); } catch (e) {}
  }
  function limparCache() { try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {} }

  async function iniciar() {
    /* tenta usar o cache para não esperar o backend em cada troca de página */
    const cache = lerCache();
    if (cache && cache.dados && cache.dados.usuario) {
      eu = cache.dados.usuario;
      cursosCache = cache.dados.cursos || [];
      progressoCache = new Set(cache.dados.progresso || []);
      promosCache = cache.dados.promos || [];
      alunosCache = cache.dados.alunos || [];
      matriculasCache = cache.dados.matriculas || [];
      /* revalida em segundo plano apenas se o cache tiver mais de 30s */
      if (Date.now() - cache.ts > 30 * 1000) revalidar();
      return eu;
    }
    /* uma única chamada: /api/app já verifica sessão internamente */
    const r = await api('/app');
    if (!r || !r.ok) { eu = null; limparDados(); limparCache(); return null; }
    eu = r.usuario;
    cursosCache = r.cursos || [];
    progressoCache = new Set(r.progresso || []);
    promosCache = r.promos || [];
    alunosCache = r.alunos || [];
    matriculasCache = r.matriculas || [];
    salvarCache(r);
    return eu;
  }

  async function revalidar() {
    try {
      const r = await api('/app');
      if (!r || !r.ok) { limparCache(); eu = null; limparDados(); return; }
      eu = r.usuario;
      cursosCache = r.cursos || [];
      progressoCache = new Set(r.progresso || []);
      promosCache = r.promos || [];
      alunosCache = r.alunos || [];
      matriculasCache = r.matriculas || [];
      salvarCache(r);
    } catch (e) {}
  }

  async function carregarDados() {
    const r = await api('/app');
    if (!r || !r.ok) { limparDados(); limparCache(); return; }
    cursosCache = r.cursos || [];
    progressoCache = new Set(r.progresso || []);
    promosCache = r.promos || [];
    alunosCache = r.alunos || [];
    matriculasCache = r.matriculas || [];
    salvarCache(r);
  }
  function limparDados() {
    cursosCache = []; progressoCache = new Set();
    promosCache = []; alunosCache = []; matriculasCache = [];
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
    await api('/auth/sair', { metodo: 'POST' });
    eu = null; limparDados();
  }

  const esqueciSenha = (email) => api('/auth/esqueci-senha', { metodo: 'POST', corpo: { email } });
  const redefinirSenha = (access, refresh, senha) =>
    api('/auth/redefinir-senha', { metodo: 'POST', corpo: { access, refresh, senha } });

  /* ------------------------------------------------------------ cursos */
  const cursos = () => cursosCache;
  const cursosDoUsuario = () => cursosCache; // o servidor já devolve só o que o aluno tem acesso
  const acharCurso = (id) => cursosCache.find((c) => c.id === id);

  async function salvarCurso(ed) {
    const r = await api('/admin/cursos', { metodo: 'POST', corpo: { curso: ed } });
    if (!r.ok) return r;
    const i = cursosCache.findIndex((c) => c.id === r.curso.id);
    if (i >= 0) cursosCache[i] = r.curso; else cursosCache.push(r.curso);
    limparCache();
    return { ok: true, curso: r.curso };
  }

  async function novoCurso() {
    const r = await api('/admin/cursos', { metodo: 'POST', corpo: { curso: { titulo: 'Novo curso', modulos: [] } } });
    if (!r.ok) return r;
    cursosCache.push(r.curso);
    limparCache();
    return { ok: true, curso: r.curso };
  }

  async function excluirCurso(id) {
    const r = await api('/admin/cursos?id=' + encodeURIComponent(id), { metodo: 'DELETE' });
    if (r.ok) { cursosCache = cursosCache.filter((c) => c.id !== id); limparCache(); }
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
    gravarProgressoNoCache();
    const r = await api('/progresso', { metodo: 'POST', corpo: { aula_id: aulaId, acao: vai ? 'marcar' : 'desmarcar' } });
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
      c.ts = Date.now(); // renova validade para evitar revalidação imediata
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch (e) {}
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

  async function gerenciarAluno(usuarioId, acao, cursosIds) {
    const r = await api('/admin/alunos', {
      metodo: 'POST',
      corpo: { usuario_id: usuarioId, acao, ...(acao === 'cursos' ? { cursos: cursosIds } : {}) },
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

  /** Lê um PDF como dataURL (o servidor recebe junto no salvamento do curso). */
  function lerPDF(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 4.5 * 1024 * 1024) {
        return reject(new Error(`"${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite por arquivo é 4,5 MB.`));
      }
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Falha ao ler o PDF.'));
      leitor.onload = () => resolve({ id: null, nome: file.name, dados: leitor.result });
      leitor.readAsDataURL(file);
    });
  }

  return {
    uid,
    usuarioAtual, iniciar, entrar, cadastrar, sair, proteger,
    esqueciSenha, redefinirSenha,
    usuarios, matriculas, cursosDoAluno, gerenciarAluno,
    cursos, cursosDoUsuario, acharCurso, salvarCurso, novoCurso, excluirCurso,
    estatisticasCurso, parseDuracao,
    estaConcluida, alternarConcluida, progressoCurso,
    comentariosDe, comentar, excluirComentario,
    promos, salvarPromos,
    comprimirImagem, lerPDF,
  };
})();

/* ------------------------------------------------------------- PWA / SW */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* -------------------------------------------------------------- helpers */
const UI = {
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
  /* prompt de instalação do PWA */
  capturarInstalacao() {
    let evento = null;
    const botao = document.getElementById('btn-instalar');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); evento = e;
      if (botao) botao.classList.remove('oculto');
    });
    if (botao) botao.addEventListener('click', async () => {
      if (!evento) return;
      evento.prompt();
      await evento.userChoice;
      evento = null; botao.classList.add('oculto');
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
    el.querySelector('#nav-sair').addEventListener('click', () => {
      if (confirm('Deseja sair da plataforma?')) Store.sair().finally(() => { location.href = 'index.html'; });
    });
  },
};
