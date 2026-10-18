/* POST /api/admin/cursos — cria/edita um curso (com módulos, aulas, capa e PDFs).
   POST recebe { curso } no formato que as páginas usam; a API converte para as
   tabelas, envia arquivos ao Storage e devolve o curso salvo. DELETE ?id= apaga. */
'use strict';
const { randomUUID } = require('crypto');
const {
  json, envFaltando, exigirAdmin, postgrest, storage, apagarStorage,
  cursoParaEd, dataUrlParaBytes, env,
} = require('../../api');

async function cursoCompleto(id) {
  const r = await postgrest(
    `/cursos?id=eq.${encodeURIComponent(id)}&select=*,modulos(*,aulas(*,materiais(*)))`,
    { servico: true }
  );
  const c = (r.dados || [])[0];
  return c ? cursoParaEd(c) : null;
}

module.exports = async (req, res) => {
  const falta = envFaltando();
  if (falta.length) return json(res, 500, { ok: false, erro: 'Configuração incompleta no servidor.', falta });
  const admin = await exigirAdmin(req, res);
  if (!admin) return undefined;

  /* ---------------------------------------------------- excluir */
  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    if (!id) return json(res, 200, { ok: false, erro: 'Curso não informado.' });

    const rc = await postgrest(`/cursos?id=eq.${encodeURIComponent(id)}&select=capa_url`, { servico: true });
    const capa = rc.dados && rc.dados[0] && rc.dados[0].capa_url;

    /* arquivos do Storage antes do banco (o banco apaga em cascata) */
    const rm = await postgrest(
      `/modulos?curso_id=eq.${encodeURIComponent(id)}&select=aulas(materiais(caminho))`, { servico: true }
    );
    for (const m of rm.dados || [])
      for (const a of m.aulas || [])
        for (const p of a.materiais || []) await apagarStorage('materiais', p.caminho);

    await postgrest(`/cursos?id=eq.${encodeURIComponent(id)}`, { metodo: 'DELETE', servico: true });
    if (capa && capa.includes('/storage/v1/object/public/capas/'))
      await apagarStorage('capas', capa.split('/object/public/capas/')[1]);

    return json(res, 200, { ok: true });
  }

  /* ---------------------------------------------------- salvar */
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'Método não permitido.' });

  const ed = (req.body || {}).curso || {};
  const titulo = String(ed.titulo || '').trim();
  if (!titulo) return json(res, 200, { ok: false, erro: 'O curso precisa de um título.' });

  const id = ed.id || randomUUID();

  /* capa: dataURL vira arquivo público no bucket; URL/emoji segue como está */
  let capaUrl = '';
  if (String(ed.capaImagem || '').startsWith('data:')) {
    const b = dataUrlParaBytes(ed.capaImagem);
    if (b) {
      const ext = b.mime.includes('png') ? 'png' : 'jpg';
      const caminho = `${id}.capa.${ext}`;
      const r = await storage('POST', `object/capas/${caminho}`, { corpo: b.dados, contentType: b.mime, upsert: true });
      if (r.ok) capaUrl = `${env.SUPABASE_URL}/storage/v1/object/public/capas/${caminho}`;
    }
  } else {
    capaUrl = String(ed.capaImagem || '');
  }

  const linha = {
    id,
    titulo,
    subtitulo: String(ed.subtitulo || '').trim(),
    categoria: String(ed.categoria || '').trim(),
    nivel: String(ed.nivel || 'Básico'),
    descricao: String(ed.descricao || '').trim(),
    capa_emoji: String(ed.capaEmoji || '🩺').slice(0, 8),
    capa_url: capaUrl,
  };
  const rc = await postgrest('/cursos', { metodo: 'POST', servico: true, upsert: true, corpo: linha });
  if (!rc.ok) return json(res, 200, { ok: false, erro: 'Não foi possível salvar o curso. (status ' + rc.status + ' ' + JSON.stringify(rc.dados || '').slice(0, 200) + ')' });

  /* ------------------------------------------------ módulos/aulas */
  const modsAntigos = (await postgrest(`/modulos?curso_id=eq.${id}&select=*`, { servico: true })).dados || [];
  const idsMods = new Set();

  for (let i = 0; i < (ed.modulos || []).length; i++) {
    const m = ed.modulos[i] || {};
    const mid = m.id || randomUUID();
    idsMods.add(mid);
    await postgrest('/modulos', {
      metodo: 'POST', servico: true, upsert: true,
      corpo: { id: mid, curso_id: id, titulo: String(m.titulo || '').trim() || `Módulo ${i + 1}`, ordem: i + 1 },
    });

    const aulasAntigas = (await postgrest(`/aulas?modulo_id=eq.${mid}&select=*`, { servico: true })).dados || [];
    const idsAulas = new Set();

    for (let j = 0; j < (m.aulas || []).length; j++) {
      const a = m.aulas[j] || {};
      const aid = a.id || randomUUID();
      idsAulas.add(aid);
      await postgrest('/aulas', {
        metodo: 'POST', servico: true, upsert: true,
        corpo: {
          id: aid, modulo_id: mid,
          titulo: String(a.titulo || '').trim() || `Aula ${j + 1}`,
          youtube_id: String(a.youtubeId || '').trim(),
          duracao: String(a.duracao || '').trim(),
          descricao: String(a.descricao || '').trim(),
          ordem: j + 1,
        },
      });

      /* materiais: os que já têm id seguem; os novos sobem ao Storage */
      const matsAntigos = (await postgrest(`/materiais?aula_id=eq.${aid}&select=*`, { servico: true })).dados || [];
      const idsMats = new Set();
      for (const p of a.pdfs || []) {
        if (p.id) { idsMats.add(p.id); continue; }
        if (!p.dados) continue;
        const b = dataUrlParaBytes(p.dados);
        if (!b) continue;
        const pid = randomUUID();
        const nome = String(p.nome || 'material.pdf').replace(/[^\w.\- ()]+/g, '_').slice(0, 120);
        const caminho = `${aid}/${pid}-${nome}`;
        const r = await storage('POST', `object/materiais/${caminho}`, { corpo: b.dados, contentType: 'application/pdf' });
        if (!r.ok) continue;
        const ri = await postgrest('/materiais', { metodo: 'POST', servico: true, corpo: { id: pid, aula_id: aid, nome, caminho } });
        if (ri.ok) idsMats.add(pid);
      }
      for (const antigo of matsAntigos)
        if (!idsMats.has(antigo.id)) {
          await postgrest(`/materiais?id=eq.${antigo.id}`, { metodo: 'DELETE', servico: true });
          await apagarStorage('materiais', antigo.caminho);
        }
    }

    /* aulas removidas do editor */
    for (const antiga of aulasAntigas)
      if (!idsAulas.has(antiga.id)) {
        const mats = (await postgrest(`/materiais?aula_id=eq.${antiga.id}&select=caminho`, { servico: true })).dados || [];
        for (const mm of mats) await apagarStorage('materiais', mm.caminho);
        await postgrest(`/aulas?id=eq.${antiga.id}`, { metodo: 'DELETE', servico: true });
      }
  }

  /* módulos removidos do editor */
  for (const antigo of modsAntigos)
    if (!idsMods.has(antigo.id)) {
      const rm2 = await postgrest(`/aulas?modulo_id=eq.${antigo.id}&select=id`, { servico: true });
      for (const a of rm2.dados || []) {
        const mats = (await postgrest(`/materiais?aula_id=eq.${a.id}&select=caminho`, { servico: true })).dados || [];
        for (const mm of mats) await apagarStorage('materiais', mm.caminho);
        await postgrest(`/materiais?aula_id=eq.${a.id}`, { metodo: 'DELETE', servico: true });
      }
      await postgrest(`/modulos?id=eq.${antigo.id}`, { metodo: 'DELETE', servico: true });
    }

  const salvo = await cursoCompleto(id);
  return json(res, 200, { ok: true, curso: salvo });
};
