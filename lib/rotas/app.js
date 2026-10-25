/* GET /api/app — cursos acessíveis completos e catálogo comercial sem conteúdo restrito. */
'use strict';
const { json, envFaltando, sessaoPerfil, postgrest, cursoParaEd, promoParaEd } = require('../api');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });
  const perfil = await sessaoPerfil(req);
  if (!perfil) return json(res, 401, { ok: false, erro: 'Sem sessão.' });
  const ehAdmin = perfil.papel === 'admin';

  try {
    /* A primeira consulta contém apenas a apresentação dos cursos. Aulas,
       IDs de vídeo e caminhos de PDFs são consultados só após autorizar. */
    const [rc, rm, rp, rv, ra] = await Promise.all([
      postgrest('/cursos?select=id,titulo,subtitulo,categoria,nivel,descricao,capa_emoji,capa_url,tipo_acesso,url_vendas,criado_em&order=criado_em.asc', { servico: true }),
      postgrest(ehAdmin ? '/matriculas?select=usuario_id,curso_id' : `/matriculas?usuario_id=eq.${perfil.id}&select=curso_id`, { servico: true }),
      postgrest(`/progresso?usuario_id=eq.${perfil.id}&select=aula_id`, { servico: true }),
      postgrest('/promos?ativo=eq.true&select=id,titulo,texto,emoji,link,imagem_url,ordem&order=ordem.asc', { servico: true }),
      ehAdmin ? postgrest('/perfis?select=id,nome,email,whatsapp,papel,liberado,criado_em&order=criado_em.asc', { servico: true }) : Promise.resolve({ ok: true, dados: [] }),
    ]);
    if ([rc, rm, rp, rv, ra].some(r => !r.ok || !Array.isArray(r.dados)))
      throw new Error('Dados indisponíveis.');

    const matriculados = new Set(rm.dados.map(m => m.curso_id));
    const permitidos = rc.dados.filter(c => ehAdmin || c.tipo_acesso === 'gratis' || matriculados.has(c.id));
    const ids = permitidos.map(c => c.id);
    let cursos = [];
    if (ids.length) {
      const completos = await postgrest(`/cursos?id=in.(${ids.map(encodeURIComponent).join(',')})&select=*,modulos(*,aulas(*,materiais(*)))&order=criado_em.asc`, { servico: true });
      if (!completos.ok || !Array.isArray(completos.dados)) throw new Error('Conteúdo indisponível.');
      cursos = completos.dados.map(c => ({ ...cursoParaEd(c), acessoLiberado: true }));
    }
    const acessiveis = new Set(ids);
    const catalogo = rc.dados.filter(c => !acessiveis.has(c.id)).map(c => {
      /* Whitelist de metadados: não repassar estruturas de conteúdo ao catálogo. */
      return {
        id: c.id, titulo: c.titulo, subtitulo: c.subtitulo || '', descricao: c.descricao || '',
        categoria: c.categoria || '', nivel: c.nivel || '',
        capaEmoji: c.capa_emoji || '🩺', capaImagem: c.capa_url || '',
        tipoAcesso: c.tipo_acesso, urlVendas: c.url_vendas || '', acessoLiberado: false,
      };
    });
    return json(res, 200, {
      ok: true,
      usuario: { id: perfil.id, nome: perfil.nome, email: perfil.email, whatsapp: perfil.whatsapp, papel: perfil.papel },
      cursos, catalogo,
      progresso: rp.dados.map(x => x.aula_id),
      promos: rv.dados.map(promoParaEd),
      alunos: ehAdmin ? ra.dados : [],
      matriculas: ehAdmin ? rm.dados : [],
    });
  } catch (e) {
    return json(res, 503, { ok: false, erro: 'Não foi possível carregar os cursos agora. Tente novamente.' });
  }
};
