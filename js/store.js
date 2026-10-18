/* ==========================================================================
   AGORAMED — camada de dados e autenticação (localStorage)
   Versão DEMONSTRAÇÃO estática: os dados ficam no navegador de cada aparelho.
   Não use em produção sem um servidor real.
   ========================================================================== */

const Store = (() => {
  const K = {
    usuarios: 'ma_usuarios',
    sessao: 'ma_sessao',
    cursos: 'ma_cursos',
    comentarios: 'ma_comentarios',
    promos: 'ma_promos',
    progresso: 'ma_progresso',
    versao: 'ma_versao',
  };

  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  /* hash simples (demonstração apenas — NÃO é segurança real) */
  const hash = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
    return 'h' + (h >>> 0).toString(16);
  };

  const ler = (chave, padrao) => {
    try { const v = JSON.parse(localStorage.getItem(chave)); return v ?? padrao; }
    catch { return padrao; }
  };
  const gravar = (chave, valor) => {
    try { localStorage.setItem(chave, JSON.stringify(valor)); }
    catch (e) {
      alert('Armazenamento do navegador cheio! Remova alguns PDFs ou imagens grandes (Painel do professor).');
      throw e;
    }
  };

  /* ---------------------------------------------------------------- seed */
  function semear() {
    if (localStorage.getItem(K.versao)) return;

    const adminId = 'prof01';
    const usuarios = [{
      id: adminId, nome: 'Professor(a)', email: 'admin@plataforma.com',
      senha: hash('admin123'), papel: 'admin', liberado: true, cursos: [],
    }, {
      id: 'aluno01', nome: 'Aluno Demonstração', email: 'aluno@demo.com',
      senha: hash('123456'), papel: 'aluno', liberado: true, cursos: ['curso1'],
    }];

    const cursos = [{
      id: 'curso1',
      titulo: 'Conduta em Emergências: os primeiros 30 minutos',
      subtitulo: 'O que não pode faltar na sua primeira atuação no pronto-socorro',
      categoria: 'Emergência', nivel: 'Intermediário',
      descricao: 'Aula a aula, os algoritmos essenciais de abordagem, estabilização e condução das principais urgências, com foco no dia a dia de quem está começando.',
      capaEmoji: '🚨',
      capaImagem: '',
      criadoEm: Date.now(),
      modulos: [
        {
          id: uid(), titulo: 'Módulo 1 — Avaliação inicial e vias aéreas', aulas: [
            { id: uid(), titulo: 'ABCDE: a sequência que salva vidas', youtubeId: '', duracao: '14:20', descricao: 'Como estruturar a primeira avaliação sem se perder.', pdfs: [] },
            { id: uid(), titulo: 'Via aérea difícil: planos A, B e C', youtubeId: '', duracao: '18:05', descricao: '', pdfs: [] },
          ],
        },
        {
          id: uid(), titulo: 'Módulo 2 — Torácicas e cardiovasculares', aulas: [
            { id: uid(), titulo: 'Dor torácica: o que ignorar e o que investigar', youtubeId: '', duracao: '21:40', descricao: '', pdfs: [] },
            { id: uid(), titulo: 'Arritmias instáveis: cardioversão e drogas', youtubeId: '', duracao: '16:10', descricao: '', pdfs: [] },
          ],
        },
        {
          id: uid(), titulo: 'Módulo 3 — Casos comentados', aulas: [
            { id: uid(), titulo: 'Caso 1: o paciente jovem com dispneia', youtubeId: '', duracao: '12:55', descricao: 'Discussão de caso real (anonymizado).', pdfs: [] },
          ],
        },
      ],
    }];

    const promos = [{
      id: uid(),
      titulo: 'Course: Insuficiência Respiratória na prática',
      texto: 'Do reconhecimento à ventilação não invasiva — turma com vagas limitadas.',
      emoji: '🫁', link: '', capaImagem: '',
    }, {
      id: uid(),
      titulo: 'Curso: Antibioticoterapia racional',
      texto: 'Escolha do esquema, desescalonamento e stewardship no plantão.',
      emoji: '💊', link: '', capaImagem: '',
    }];

    gravar(K.usuarios, usuarios);
    gravar(K.cursos, cursos);
    gravar(K.promos, promos);
    gravar(K.comentarios, []);
    gravar(K.progresso, {});
    localStorage.setItem(K.versao, '1');
  }
  semear();

  /* ------------------------------------------------------------ sessão */
  const usuarios = () => ler(K.usuarios, []);
  const salvarUsuarios = (l) => gravar(K.usuarios, l);

  function usuarioAtual() {
    const id = localStorage.getItem(K.sessao);
    if (!id) return null;
    return usuarios().find(u => u.id === id) || null;
  }

  function entrar(email, senha) {
    const u = usuarios().find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.senha !== hash(senha)) return { ok: false, erro: 'E-mail ou senha incorretos.' };
    if (!u.liberado) return { ok: false, pendente: true, erro: 'Sua conta ainda está aguardando liberação pelo professor.' };
    localStorage.setItem(K.sessao, u.id);
    return { ok: true, usuario: u };
  }

  /* WhatsApp: só dígitos, com remoção do +55 opcional */
  function normalizarWhats(valor) {
    let d = String(valor || '').replace(/\D/g, '');
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
    return d;
  }

  function cadastrar(nome, email, senha, whatsapp) {
    if (nome.trim().length < 3) return { ok: false, erro: 'Informe seu nome completo.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
    if (senha.length < 6) return { ok: false, erro: 'A senha precisa de ao menos 6 caracteres.' };
    const whats = normalizarWhats(whatsapp);
    if (whats.length < 10 || whats.length > 11 || whats[0] === '0')
      return { ok: false, erro: 'Informe o WhatsApp com DDD (ex.: 11 98765-4321).' };
    if (usuarios().some(x => x.email.toLowerCase() === email.trim().toLowerCase()))
      return { ok: false, erro: 'Já existe uma conta com este e-mail.' };
    const u = { id: uid(), nome: nome.trim(), email: email.trim().toLowerCase(), senha: hash(senha), whatsapp: whats, papel: 'aluno', liberado: false, cursos: [] };
    salvarUsuarios([...usuarios(), u]);
    return { ok: true };
  }

  function sair() { localStorage.removeItem(K.sessao); }

  /* guarda de páginas internas */
  function proteger() {
    const u = usuarioAtual();
    if (!u) { location.href = 'index.html'; return null; }
    if (!u.liberado) { localStorage.removeItem(K.sessao); location.href = 'index.html?pendente=1'; return null; }
    return u;
  }

  /* ------------------------------------------------------------- cursos */
  const cursos = () => ler(K.cursos, []);
  const salvarCursos = (l) => gravar(K.cursos, l);
  const acharCurso = (id) => cursos().find(c => c.id === id);

  function cursosDoUsuario(u) {
    if (!u) return [];
    if (u.papel === 'admin') return cursos();
    return cursos().filter(c => (u.cursos || []).includes(c.id));
  }

  function salvarCurso(curso) {
    const lista = cursos();
    const i = lista.findIndex(c => c.id === curso.id);
    if (i >= 0) lista[i] = curso; else lista.push(curso);
    salvarCursos(lista);
  }

  function novoCurso() {
    const c = {
      id: uid(), titulo: 'Novo curso', subtitulo: '', categoria: '', nivel: 'Básico',
      descricao: '', capaEmoji: '🩺', capaImagem: '', criadoEm: Date.now(), modulos: [],
    };
    salvarCurso(c);
    return c;
  }

  function excluirCurso(id) {
    salvarCursos(cursos().filter(c => c.id !== id));
    const us = usuarios(); us.forEach(u => u.cursos = (u.cursos || []).filter(x => x !== id)); salvarUsuarios(us);
  }

  /* ------------------------------------------------- estatísticas/duração */
  function parseDuracao(txt) {
    if (!txt) return 0;
    const p = String(txt).split(':').map(Number).filter(n => !isNaN(n));
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
  }

  function estatisticasCurso(c) {
    let aulas = 0, segundos = 0, pdfs = 0;
    (c.modulos || []).forEach(m => (m.aulas || []).forEach(a => {
      aulas++; segundos += parseDuracao(a.duracao); pdfs += (a.pdfs || []).length;
    }));
    const h = Math.floor(segundos / 3600), min = Math.round((segundos % 3600) / 60);
    const duracao = segundos === 0 ? 'em atualização' : (h > 0 ? `${h}h${String(min).padStart(2, '0')}` : `${min} min`);
    return { aulas, duracao, pdfs, modulos: (c.modulos || []).length };
  }

  /* ------------------------------------------------------------ progresso */
  const progressos = () => ler(K.progresso, {});
  const chaveProg = (userId, aulaId) => `${userId}|${aulaId}`;

  const estaConcluida = (userId, aulaId) => !!progressos()[chaveProg(userId, aulaId)];
  function alternarConcluida(userId, aulaId) {
    const p = progressos(), k = chaveProg(userId, aulaId);
    if (p[k]) delete p[k]; else p[k] = Date.now();
    gravar(K.progresso, p);
  }

  function progressoCurso(userId, curso) {
    let total = 0, feitas = 0;
    (curso.modulos || []).forEach(m => (m.aulas || []).forEach(a => { total++; if (estaConcluida(userId, a.id)) feitas++; }));
    return { total, feitas, percentual: total ? Math.round(feitas / total * 100) : 0 };
  }

  /* ----------------------------------------------------------- comentários */
  const comentarios = () => ler(K.comentarios, []);
  function comentariosDe(contexto) {
    return comentarios().filter(c => c.contexto === contexto).sort((a, b) => a.ts - b.ts);
  }
  function comentar(contexto, usuario, texto) {
    const lista = comentarios();
    lista.push({ id: uid(), contexto, userId: usuario.id, nome: usuario.nome, papel: usuario.papel, texto: texto.trim(), ts: Date.now() });
    gravar(K.comentarios, lista);
  }
  function excluirComentario(id, usuario) {
    if (!usuario) return;
    gravar(K.comentarios, comentarios().filter(
      c => !(c.id === id && (usuario.papel === 'admin' || c.userId === usuario.id))
    ));
  }

  /* --------------------------------------------------------------- promos */
  const promos = () => ler(K.promos, []);
  const salvarPromos = (l) => gravar(K.promos, l);

  /* -------------------------------------------------------- imagens/PDFs */
  /** Comprime uma imagem para dataURL (JPEG) caber no localStorage. */
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

  function lerPDF(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 4.5 * 1024 * 1024) {
        return reject(new Error(`"${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite por arquivo nesta versão demo é 4,5 MB (PDFs comprimidos).`));
      }
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Falha ao ler o PDF.'));
      leitor.onload = () => resolve({ id: uid(), nome: file.name, dados: leitor.result });
      leitor.readAsDataURL(file);
    });
  }

  return {
    uid,
    usuarioAtual, entrar, cadastrar, sair, proteger,
    usuarios, salvarUsuarios,
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
      if (confirm('Deseja sair da plataforma?')) { Store.sair(); location.href = 'index.html'; }
    });
  },
};
